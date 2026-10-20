// Holds the creation form for one campaign and keeps it in sync with the server.
// Drafts autosave shortly after each change; live campaigns save only when the creator
// confirms, because saving sends them back to review.
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { campaignsApi } from "@/api/campaigns";
import { ApiError } from "@/api/client";
import { keys, useMyCampaign } from "@/api/queries";
import type { AdAsset, CampaignPatch, Category, CreatorType, OwnerCampaign, Reach, Source, StoryBlock } from "@/api/types";

export type DraftForm = {
  title: string;
  category: Category | null;
  creatorName: string;
  creatorType: CreatorType | null;
  creatorDescription: string;
  summary: string;
  coverImageUrl: string | null;
  targetAudience: string;
  whyItMatters: string;
  storyHeadline: string;
  storyIntro: string;
  storyBlocks: StoryBlock[];
  sources: Source[];
  adHeadline: string;
  adDescription: string;
  ctaText: string;
  adAssets: AdAsset[];
  reach: Reach;
  durationDays: number | null;
  fundingGoalCents: number | null;
  rulesAccepted: boolean;
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export function formFromCampaign(c: OwnerCampaign): DraftForm {
  return {
    title: c.title ?? "",
    category: c.category,
    creatorName: c.creatorName ?? "",
    creatorType: c.creatorType,
    creatorDescription: c.creatorDescription ?? "",
    summary: c.summary ?? "",
    coverImageUrl: c.coverImageUrl,
    targetAudience: c.targetAudience ?? "",
    whyItMatters: c.whyItMatters ?? "",
    storyHeadline: c.story.headline ?? "",
    storyIntro: c.story.intro ?? "",
    storyBlocks: c.story.blocks ?? [],
    sources: c.sources ?? [],
    adHeadline: c.adHeadline ?? "",
    adDescription: c.ad.description ?? "",
    ctaText: c.ad.ctaText ?? "",
    adAssets: c.ad.assets ?? [],
    reach: {
      locations: c.reach.locations ?? [],
      ageMin: c.reach.ageMin ?? null,
      ageMax: c.reach.ageMax ?? null,
      interests: c.reach.interests ?? [],
      channels: c.reach.channels ?? [],
      budgetSplit: c.reach.budgetSplit ?? {},
    },
    durationDays: c.durationDays,
    fundingGoalCents: c.fundingGoalCents,
    rulesAccepted: c.rulesAccepted,
  };
}

const FULL_URL = /^https?:\/\/\S+\.\S+/;

/** Text fields are sent as null when empty, so clearing a field really clears it. */
function toPatch(form: DraftForm, fields: Iterable<keyof DraftForm>): CampaignPatch {
  const patch: Record<string, unknown> = {};
  for (const f of fields) {
    const v = form[f];
    if (f === "durationDays" && v === null) continue; // server only accepts a valid choice
    if (f === "storyBlocks") {
      // An image section without an uploaded image yet isn't valid; keep it locally, don't send it
      // Same for an action link that isn't a full URL yet
      patch[f] = form.storyBlocks
        .filter((b) => b.type !== "image" || b.url)
        .map((b) => (b.type === "action" && b.url && !FULL_URL.test(b.url) ? { ...b, url: undefined } : b));
      continue;
    }
    patch[f] = typeof v === "string" ? (v.trim() === "" ? null : v) : v;
  }
  return patch as CampaignPatch;
}

const AUTOSAVE_MS = 900;

/**
 * Whether the creator has put anything of their own into the draft. Ignores what the server pre-fills
 * (creator name) and choices with defaults, so an opened-and-abandoned draft counts as empty.
 */
export function hasContent(f: DraftForm) {
  const text = [f.title, f.summary, f.creatorDescription, f.targetAudience, f.whyItMatters, f.storyHeadline, f.storyIntro, f.adHeadline, f.adDescription];
  return (
    text.some((t) => t.trim() !== "") ||
    f.storyBlocks.some((b) => b.type !== "paragraph" || b.text.trim() !== "") ||
    f.sources.length > 0 ||
    f.adAssets.length > 0 ||
    f.coverImageUrl !== null ||
    f.reach.locations.length > 0 ||
    f.fundingGoalCents !== null
  );
}

export function useDraft(id: string) {
  const qc = useQueryClient();
  const query = useMyCampaign(id);
  const campaign = query.data;
  const [form, setForm] = useState<DraftForm | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirtyCount, setDirtyCount] = useState(0);

  const formRef = useRef<DraftForm | null>(null);
  const dirty = useRef(new Set<keyof DraftForm>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<OwnerCampaign | null> | null>(null);

  // A campaign sent back with requested changes is edited like a draft and resubmitted
  const isDraft = campaign?.status === "draft" || campaign?.status === "changes_requested";

  // Initialise once from a fresh server copy (never a stale cache); afterwards local edits are the source of truth
  useEffect(() => {
    if (campaign && !formRef.current && query.isFetchedAfterMount) {
      const initial = formFromCampaign(campaign);
      formRef.current = initial;
      setForm(initial);
    }
  }, [campaign, query.isFetchedAfterMount]);

  const save = useCallback(
    async (extra: CampaignPatch = {}): Promise<OwnerCampaign | null> => {
      if (timer.current) clearTimeout(timer.current);
      if (inFlight.current) await inFlight.current; // keep saves in order
      const fields = [...dirty.current];
      if (!formRef.current || (fields.length === 0 && Object.keys(extra).length === 0)) return campaign ?? null;
      dirty.current.clear();
      setDirtyCount(0);
      setSaveState("saving");
      setSaveError(null);

      const run = campaignsApi
        .update(id, { ...toPatch(formRef.current, fields), ...extra })
        .then((updated) => {
          qc.setQueryData(keys.myCampaign(id), updated);
          void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
          setSaveState("saved");
          return updated;
        })
        .catch((err: unknown) => {
          // Put the fields back so the next attempt retries them
          fields.forEach((f) => dirty.current.add(f));
          setDirtyCount(dirty.current.size);
          setSaveState("error");
          setSaveError(err instanceof ApiError ? err.message : "Couldn't save. Check your connection.");
          return null;
        })
        .finally(() => {
          inFlight.current = null;
        });
      inFlight.current = run;
      return run;
    },
    [campaign, id, qc],
  );

  const set = useCallback(
    <K extends keyof DraftForm>(field: K, value: DraftForm[K]) => {
      if (!formRef.current) return;
      const next = { ...formRef.current, [field]: value };
      formRef.current = next;
      setForm(next);
      dirty.current.add(field);
      setDirtyCount(dirty.current.size);
      if (isDraft) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
      }
    },
    [isDraft, save],
  );

  /** Apply several fields at once (AI suggestions). */
  const setMany = useCallback(
    (values: Partial<DraftForm>) => {
      if (!formRef.current) return;
      const next = { ...formRef.current, ...values };
      formRef.current = next;
      setForm(next);
      (Object.keys(values) as (keyof DraftForm)[]).forEach((k) => dirty.current.add(k));
      setDirtyCount(dirty.current.size);
      if (isDraft) void save();
    },
    [isDraft, save],
  );

  // Leaving the screen: an empty draft is deleted so it doesn't clutter "Your drafts";
  // otherwise anything pending is saved (drafts only; live edits need confirmation)
  const statusRef = useRef(campaign?.status);
  useEffect(() => {
    statusRef.current = campaign?.status;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (formRef.current && statusRef.current === "draft" && !hasContent(formRef.current)) {
        void campaignsApi
          .remove(id)
          .then(() => qc.invalidateQueries({ queryKey: ["my-campaigns"] }))
          .catch(() => {});
        return;
      }
      if (dirty.current.size > 0 && formRef.current && statusRef.current === "draft") {
        void campaignsApi
          .update(id, toPatch(formRef.current, dirty.current))
          .then((u) => {
            qc.setQueryData(keys.myCampaign(id), u);
            void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
          })
          .catch(() => {});
      }
    },
    [id, qc],
  );

  return {
    query,
    campaign,
    form,
    set,
    setMany,
    save,
    saveState,
    saveError,
    hasUnsaved: dirtyCount > 0,
    isDraft,
  };
}

export type Draft = ReturnType<typeof useDraft>;

// ─── Validation, mirroring the server's readiness check ───────────────────────

export type FieldErrors = Partial<Record<string, string>>;

export function validateStep(step: number, f: DraftForm): FieldErrors {
  const e: FieldErrors = {};
  if (step === 1) {
    if (!f.title.trim()) e.title = "Add a campaign title.";
    if (!f.category) e.category = "Choose a category.";
    if (!f.creatorName.trim()) e.creatorName = "Add the creator or organization name.";
    if (!f.summary.trim()) e.summary = "Add a short summary.";
    if (!f.coverImageUrl) e.coverImageUrl = "Add a cover image.";
  }
  if (step === 2) {
    if (!f.storyBlocks.some((b) => b.type === "paragraph" && b.text.trim())) e.storyBlocks = "Write at least one paragraph of your story.";
    const ids = new Set(f.sources.map((s) => s.id));
    if (f.storyBlocks.some((b) => b.type === "stat" && b.sourceId && !ids.has(b.sourceId))) {
      e.storyBlocks = "A statistic points to a source that no longer exists.";
    }
  }
  if (step === 3) {
    // The ads need at least one square image (the cover is required on Basics)
    if (!f.adAssets.some((a) => a.type === "image")) e.adAssets = "Add at least one square ad image.";
  }
  if (step === 4) {
    if (f.reach.locations.length === 0) e.locations = "Add at least one target location.";
    if (f.reach.channels.length === 0) e.channels = "Choose at least one distribution channel.";
    const total = f.reach.channels.reduce((s, ch) => s + (f.reach.budgetSplit[ch] ?? 0), 0);
    if (f.reach.channels.length > 0 && total !== 100) e.budgetSplit = "The budget split must add up to 100%.";
    if (f.reach.ageMin && f.reach.ageMax && f.reach.ageMin > f.reach.ageMax) e.age = "The minimum age is above the maximum.";
  }
  if (step === 5) {
    if (!f.fundingGoalCents) e.fundingGoalCents = "Set a funding goal.";
    if (!f.rulesAccepted) e.rulesAccepted = "Confirm the campaign rules and submission policies.";
  }
  return e;
}

export function localId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
