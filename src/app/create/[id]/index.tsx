// The five-step creation flow: Basics → Story → Campaign & Ad Visuals → Reach → Submit.
// One screen, so form state survives moving back and forth; drafts autosave as you type.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { campaignsApi } from "@/api/campaigns";
import { platformApi } from "@/api/platform";
import { ApiError } from "@/api/client";
import { keys, useConfig } from "@/api/queries";
import Animated, { FadeInLeft, FadeInRight, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Button, EmptyState, ErrorState, IconButton, Note, Skeleton, Text, useToast } from "@/components/ui";
import { aiNotes } from "@/features/create/ai-notes";
import { CampaignPreviewModal } from "@/features/create/campaign-preview";
import { StepBasics } from "@/features/create/step-basics";
import { StepReach } from "@/features/create/step-reach";
import { StepStory } from "@/features/create/step-story";
import { StepSubmit } from "@/features/create/step-submit";
import { StepVisuals } from "@/features/create/step-visuals";
import { ReviewCard } from "@/features/campaigns/review-card";
import { localId, useDraft, validateStep, type DraftForm, type FieldErrors } from "@/features/create/use-draft";
import { announceImageReady, endSamSession, registerEditor, useSamSession, useSamTalking } from "@/features/assistant/bridge";
import { SamImageOverlay, SamModeBar } from "@/features/assistant/sam-mode";
import { BlurTargetView } from "expo-blur";
import { STATUS } from "@/lib/labels";
import { goBackOr } from "@/lib/nav";
import { colors, fonts, spacing, themed } from "@/theme";
import { showAlert } from "@/components/ui/alert-dialog";

export const STEP_LABELS = ["About", "Story", "Visuals", "Reach", "Submit"];

export default function CreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // /create/new opens straight away and creates the draft behind a skeleton
  return id === "new" ? <StartDraft /> : <Editor id={id} />;
}

function StartDraft() {
  const qc = useQueryClient();
  const toast = useToast();
  const start = useMutation({
    mutationFn: () => campaignsApi.create("manual"),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      router.replace({ pathname: "/create/[id]", params: { id: c.id } });
    },
    onError: (err) => {
      toast(err instanceof ApiError ? err.message : "Couldn't start a campaign.", "error");
      goBackOr("/create");
    },
  });
  const { mutate } = start;
  useEffect(() => mutate(), [mutate]);
  return <EditorSkeleton />;
}

/** Placeholder in the editor's shape: step bar, title, then two field cards. */
function EditorSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} accessibilityLabel="Loading">
      <Stack.Screen options={{ title: "Create campaign" }} />
      <View style={[styles.progress, { gap: 8 }]}>
        <View style={styles.bars}>
          {STEP_LABELS.map((l) => (
            <View key={l} style={{ flex: 1 }}>
              <Skeleton height={4} round={2} />
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.content, { gap: spacing.md }]}>
        <Skeleton width="55%" height={24} />
        <Skeleton width="80%" height={14} />
        <View style={{ height: spacing.lg }} />
        <Skeleton width="30%" height={12} />
        <Skeleton height={210} round={16} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="30%" height={12} />
        <Skeleton height={150} round={16} />
      </View>
    </View>
  );
}

function Editor({ id }: { id: string }) {
  const draft = useDraft(id);
  const config = useConfig();

  if (draft.query.isPending || config.isPending || (draft.campaign && !draft.form)) return <EditorSkeleton />;
  if (draft.query.isError) return <ErrorState error={draft.query.error} onRetry={() => draft.query.refetch()} />;
  if (config.isError) return <ErrorState error={config.error} onRetry={() => config.refetch()} />;
  if (!draft.campaign!.isEditable) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="This campaign can't be edited now"
        body={`${STATUS[draft.campaign!.status].explain} Editing is locked once a campaign is fully funded.`}
        actionLabel="Manage campaign"
        onAction={() => router.replace({ pathname: "/manage/[id]", params: { id } })}
      />
    );
  }
  return <Wizard id={id} draft={draft} />;
}

function Wizard({ id, draft }: { id: string; draft: ReturnType<typeof useDraft> }) {
  const { campaign, form, getForm, set, setMany, save, saveState, saveError, hasUnsaved, isDraft } = draft;
  // Creating with Sam: the form is his (one thing at a time) until the last step, which is the user's
  const samMode = useSamSession(id);
  // While Sam is talking with the user the fields are his; when he's quiet the user can edit them
  const samTalking = useSamTalking();
  const blurRef = useRef<View>(null);
  const c = campaign!;
  const f = form!;
  const config = useConfig().data!;
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  // "Fix in Story ›" from a review opens the step to fix; otherwise resume where the creator left off
  const { step: stepParam } = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(() => Math.min(Math.max(Number(stepParam) || c.currentStep || 1, 1), 5));
  const samDriving = samMode && step < 5 && samTalking;
  // Steps slide in from the side you're moving towards
  const [forward, setForward] = useState(true);
  // Errors appear once Continue/Submit is tried on a step, then follow the form live: each one
  // disappears the moment its field becomes valid
  const [checkedStep, setCheckedStep] = useState<number | null>(null);
  const errors: FieldErrors = checkedStep === step ? validateStep(step, f) : {};
  const [preview, setPreview] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>(() => aiNotes.take(id));

  const goToStep = (next: number) => {
    setCheckedStep(null);
    setForward(next >= step);
    setStep(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
    // Remember where the creator is, so "Resume draft" lands on the same step
    if (isDraft) void save({ currentStep: next });
  };

  // Sam can create the cover or an ad image (~30 s); the editor shows it's on the way
  const [samImage, setSamImage] = useState<"cover" | "ad" | null>(null);
  const samImageRef = useRef<"cover" | "ad" | null>(null);
  useEffect(() => skippedOptional.clear(), [id]);
  const generateImage = (kind: "cover" | "ad", prompt: string) => {
    if (samImageRef.current) return;
    samImageRef.current = kind;
    setSamImage(kind);
    platformApi
      .generateImage(prompt, kind)
      .then((img) => {
        const { getForm: now, set: put } = latest.current;
        if (kind === "cover") put("coverImageUrl", img.url);
        else
          put("adAssets", [
            ...(now()?.adAssets ?? []),
            { id: localId("a"), type: "image", url: img.url, width: img.width, height: img.height, aiGenerated: true },
          ]);
        toast(kind === "cover" ? "Sam added your cover image" : "Sam added an ad image");
        announceImageReady(kind);
      })
      .catch((err) => toast(err instanceof ApiError ? err.message : "Sam couldn't create the image. Try again.", "error"))
      .finally(() => {
        samImageRef.current = null;
        setSamImage(null);
      });
  };

  // Sam can read this draft, fill it in from what the user says, and move between steps
  const latest = useRef({ f, getForm, set, setMany, step, goToStep, generateImage, durations: config.funding.durationDays });
  useEffect(() => {
    latest.current = { f, getForm, set, setMany, step, goToStep, generateImage, durations: config.funding.durationDays };
  });
  useEffect(
    () =>
      registerEditor({
        campaignId: id,
        get step() {
          return latest.current.step;
        },
        values: () => samValues(latest.current.f),
        missing: () => samMissing(latest.current.f),
        stepMissing: () => samStepMissing(latest.current.step, latest.current.f),
        stepMissingAt: (n) => samStepMissing(n, latest.current.f),
        fill: (field, value) => samFill(latest.current, field, value),
        goToStep: (n) => latest.current.goToStep(Math.min(5, Math.max(1, n))),
        generateImage: (kind, prompt) => latest.current.generateImage(kind, prompt),
        creatingImage: () => samImageRef.current,
      }),
    [id],
  );

  const back = () => {
    if (samMode) return void exitSam();
    if (step > 1) goToStep(step - 1);
    else leave();
  };

  // Leaving Sam mode: Sam stops, the draft is saved, and the user is back where they started
  const exitSam = async () => {
    endSamSession();
    const saved = await save();
    toast(saved ? "Draft saved. Find it in Create, under Your drafts." : "Left creating with Sam.");
    goBackOr("/create");
  };

  const leave = () => {
    if (!isDraft && hasUnsaved) {
      showAlert("Discard changes?", "Your edits to this live campaign haven't been saved.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => goBackOr("/create") },
      ]);
      return;
    }
    goBackOr("/create");
  };

  // Android back button walks back through the steps first
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  const next = () => {
    const errs = validateStep(step, f);
    setCheckedStep(step);
    if (Object.keys(errs).length > 0) {
      toast("Fill in the required fields to continue", "error");
      return;
    }
    goToStep(step + 1);
  };

  const submit = useMutation({
    mutationFn: async () => {
      const saved = await save({ currentStep: 5 });
      if (!saved) throw new Error("Couldn't save your latest changes. Check your connection and try again.");
      return campaignsApi.submit(id);
    },
    onSuccess: (updated) => {
      qc.setQueryData(keys.myCampaign(id), updated);
      void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      router.replace({ pathname: "/create/[id]/submitted", params: { id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "CAMPAIGN_INCOMPLETE") {
        void qc.invalidateQueries({ queryKey: keys.myCampaign(id) });
        toast("A few details are missing. See the list below.", "error");
      } else {
        toast(err instanceof Error ? err.message : "Couldn't submit.", "error");
      }
    },
  });

  const onSubmit = () => {
    const errs = validateStep(5, f);
    setCheckedStep(5);
    if (Object.keys(errs).length > 0) return toast("Set a funding goal and confirm the rules", "error");
    // Steps 1–4 are re-checked on the server; issues show up with a jump to the step
    submit.mutate();
  };

  const saveLive = () => {
    showAlert(
      "Save and send back to review?",
      "Saving changes to a live campaign sends it back through review before its ads are updated. Your deadline stays the same.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save changes",
          onPress: async () => {
            const saved = await save();
            if (saved) {
              toast("Saved. Your campaign is back in review.");
              goBackOr({ pathname: "/manage/[id]", params: { id } });
            }
          },
        },
      ],
    );
  };

  const saveDraftNow = async () => {
    const saved = await save();
    if (saved) toast("Draft saved");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: c.status === "changes_requested" ? "Fix campaign" : isDraft ? "Create campaign" : "Edit campaign",
          // iPhone swipe-back would skip what the back button does here (previous step, unsaved-changes
          // check, saving when leaving Sam mode), so leaving goes through the button, as on Android
          gestureEnabled: false,
          headerLeft: () =>
            samMode ? (
              <IconButton icon="close" label="Exit creating with Sam" onPress={exitSam} />
            ) : (
              <IconButton icon="arrow-back" label={step > 1 ? "Previous step" : "Close"} onPress={back} />
            ),
          headerRight: () => <SaveIndicator state={saveState} isDraft={isDraft} hasUnsaved={hasUnsaved} />,
        }}
      />

      <View style={styles.progress}>
        <StepBars step={step} />
      </View>
      {samMode && <SamModeBar yourTurn={step === 5} talking={samTalking} onExit={exitSam} />}

      <BlurTargetView ref={blurRef} style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
      >
        {c.status === "changes_requested" && c.review && (
          <ReviewCard review={c.review} onFix={goToStep} />
        )}
        {!isDraft && (
          <Note tone="warning">
            {c.editRequiresReview
              ? "You're editing a live campaign. Saving sends it back to review before ads are updated; the funding deadline stays the same."
              : "This campaign is in review. Saved changes are included in the review."}
          </Note>
        )}
        {saveState === "error" && saveError && <Note tone="danger">{`Not saved: ${saveError}`}</Note>}

        {/* While Sam is talking the fields can be seen and scrolled but not touched; they open when he's quiet */}
        <Animated.View
          key={step}
          entering={(forward ? FadeInRight : FadeInLeft).duration(260)}
          style={{ gap: spacing.lg }}
          pointerEvents={samDriving ? "none" : "auto"}
        >
          {step === 1 && (
            <StepBasics
              form={f}
              set={set}
              setMany={setMany}
              errors={errors}
              aiQuestions={aiQuestions}
              setAiQuestions={setAiQuestions}
            />
          )}
          {step === 2 && <StepStory form={f} set={set} errors={errors} />}
          {step === 3 && <StepVisuals form={f} set={set} errors={errors} />}
          {step === 4 && <StepReach form={f} set={set} errors={errors} config={config} />}
          {step === 5 && (
            <StepSubmit form={f} set={set} errors={errors} config={config} readiness={c.readiness} goToStep={goToStep} />
          )}
        </Animated.View>
      </ScrollView>
      </BlurTargetView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
        {step > 1 && <IconButton icon="arrow-back" label="Previous step" variant="soft" onPress={back} />}
        {isDraft && step === 5 ? (
          <IconButton icon="bookmark-outline" label="Save draft" variant="soft" onPress={saveDraftNow} />
        ) : isDraft ? (
          <Button label="Save draft" variant="ghost" size="sm" onPress={saveDraftNow} />
        ) : (
          <Button label="Save changes" variant="secondary" size="sm" disabled={!hasUnsaved} onPress={saveLive} />
        )}
        {!(isDraft && step === 5) && <View style={{ flex: 1 }} />}
        {step < 5 ? (
          <Button label="Continue" iconRight="arrow-forward" onPress={next} />
        ) : isDraft ? (
          <>
            <IconButton icon="eye-outline" label="Preview campaign" variant="soft" onPress={() => setPreview(true)} />
            <Button
              label={c.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}
              icon="paper-plane-outline"
              loading={submit.isPending}
              onPress={onSubmit}
              style={{ flex: 1 }}
            />
          </>
        ) : (
          <IconButton icon="eye-outline" label="Preview campaign" variant="soft" onPress={() => setPreview(true)} />
        )}
      </View>
      {samImage && <SamImageOverlay kind={samImage} blurTarget={blurRef} />}
      <CampaignPreviewModal visible={preview} onClose={() => setPreview(false)} form={f} />
    </KeyboardAvoidingView>
  );
}

/** Five segments that fill as you go, with the step names under them. */
function StepBars({ step }: { step: number }) {
  return (
    <View accessibilityLabel={`Step ${step} of 5, ${STEP_LABELS[step - 1]}`} style={{ gap: 8 }}>
      <View style={styles.bars}>
        {STEP_LABELS.map((label, i) => (
          <Segment key={label} filled={i < step} />
        ))}
      </View>
      <View style={styles.bars}>
        {STEP_LABELS.map((label, i) => (
          <Text
            key={label}
            variant="caption"
            numberOfLines={1}
            color={i + 1 === step ? colors.primary : i < step ? colors.textMuted : colors.textSubtle}
            style={[styles.barLabel, i + 1 === step && { fontFamily: fonts.semibold }]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(filled ? 1 : 0, { duration: 420 }));
  }, [filled, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, fill]} />
    </View>
  );
}

function SaveIndicator({ state, isDraft, hasUnsaved }: { state: string; isDraft: boolean; hasUnsaved: boolean }) {
  if (!isDraft) {
    return hasUnsaved ? (
      <Text variant="caption" color={colors.warning}>
        Unsaved changes
      </Text>
    ) : null;
  }
  if (state === "saving") return <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Saving" />;
  if (state === "error")
    return (
      <View style={styles.saved}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
        <Text variant="caption" color={colors.danger}>
          Not saved
        </Text>
      </View>
    );
  if (state === "saved" && !hasUnsaved)
    return (
      <View style={styles.saved} accessibilityLabel="Draft saved">
        <Ionicons name="cloud-done-outline" size={16} color={colors.success} />
        <Text variant="caption" color={colors.success}>
          Saved
        </Text>
      </View>
    );
  return null;
}

const styles = themed(() => StyleSheet.create({
  progress: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  bars: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  segmentFill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
  barLabel: { flex: 1, textAlign: "center", fontSize: 12 },
  content: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saved: { flexDirection: "row", alignItems: "center", gap: 4 },
}));

// ─── Sam ↔ editor ─────────────────────────────────────────────────────────────

const CATEGORIES = ["environment", "health", "science", "education", "public_policy", "economic_policy", "community", "arts_culture", "business", "other"];
const CREATOR_TYPES = ["individual", "influencer", "nonprofit", "organization", "business", "community_group"];
const TEXT_FIELDS = [
  "title",
  "summary",
  "creatorName",
  "creatorDescription",
  "targetAudience",
  "whyItMatters",
  "storyHeadline",
  "storyIntro",
  "adHeadline",
  "adDescription",
  "ctaText",
] as const;

function samValues(f: DraftForm): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const k of TEXT_FIELDS) out[k] = f[k] || null;
  out.category = f.category;
  out.creatorType = f.creatorType;
  out.storyParagraphs = f.storyBlocks.filter((b) => b.type === "paragraph").length;
  // The story itself (shortened), so Sam can talk about this campaign like he knows it
  out.storyText =
    f.storyBlocks
      .filter((b) => b.type === "paragraph")
      .map((b) => b.text)
      .join(" ")
      .slice(0, 500) || null;
  out.sources = f.sources.length;
  out.coverImage = f.coverImageUrl ? "added" : null;
  out.adImages = f.adAssets.length;
  out.locations = f.reach.locations.join(", ") || null;
  out.fundingGoalDollars = f.fundingGoalCents ? f.fundingGoalCents / 100 : null;
  out.durationDays = f.durationDays;
  out.channels = f.reach.channels.join(", ") || null;
  out.facebookPercent = f.reach.channels.length === 2 ? (f.reach.budgetSplit.facebook ?? null) : null;
  out.ageMin = f.reach.ageMin ?? null;
  out.ageMax = f.reach.ageMax ?? null;
  out.interests = f.reach.interests.join(", ") || null;
  out.rulesAccepted = f.rulesAccepted;
  return out;
}

// Validation keys → the names Sam uses
const SAM_NAMES: Record<string, string> = {
  coverImageUrl: "coverImage",
  storyBlocks: "storyParagraph",
  adAssets: "adImage",
  budgetSplit: "facebookPercent",
  age: "ageMin/ageMax",
  fundingGoalCents: "fundingGoalDollars",
  rulesAccepted: "rulesAccepted (user ticks it)",
};

// Optional Reach details Sam asks about once; "skip" means the user doesn't mind (cleared per editor)
const skippedOptional = new Set<string>();

/** What blocks the step on screen, in Sam's field names (plus the optional Reach details he asks once). */
function samStepMissing(step: number, f: DraftForm) {
  const out = Object.keys(validateStep(step, f)).map((k) => SAM_NAMES[k] ?? k);
  if (step === 4) {
    if (f.reach.ageMin == null && !skippedOptional.has("ageRange")) out.push("ageRange (optional, ask once)");
    if (f.reach.interests.length === 0 && !skippedOptional.has("interests"))
      out.push("interests (optional, ask once)");
  }
  return out;
}

const SKIP = /^(skip|none|no|nothing|any|all|doesn't matter|does not matter|not needed)\b/i;

/** Everything any step still needs, by field name. */
function samMissing(f: DraftForm) {
  const keys = new Set<string>();
  for (let s = 1; s <= 5; s++) Object.keys(validateStep(s, f)).forEach((k) => keys.add(k));
  return [...keys];
}

type Latest = { f: DraftForm; getForm: () => DraftForm | null; set: <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => void; setMany: (v: Partial<DraftForm>) => void; durations: number[] };

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

function samFill({ f: rendered, getForm, set, setMany, durations }: Latest, field: string, value: string) {
  // Several fills arrive at once (e.g. places and ages): each builds on the previous one, not on the last render
  const f = getForm() ?? rendered;
  const v = value.trim();
  if ((TEXT_FIELDS as readonly string[]).includes(field)) {
    set(field as (typeof TEXT_FIELDS)[number], field === "title" ? v.slice(0, 60) : v);
    return true;
  }
  switch (field) {
    case "category":
      if (!CATEGORIES.includes(v)) return false;
      set("category", v as DraftForm["category"]);
      return true;
    case "creatorType":
      if (!CREATOR_TYPES.includes(v)) return false;
      set("creatorType", v as DraftForm["creatorType"]);
      return true;
    case "storyParagraph":
      setMany({ storyBlocks: [...f.storyBlocks, { id: localId("b"), type: "paragraph", text: v }] });
      return true;
    case "fundingGoalDollars": {
      const n = Math.round(Number(v.replace(/[^0-9.]/g, "")));
      if (!n) return false;
      set("fundingGoalCents", Math.min(100_000, Math.max(100, n)) * 100);
      return true;
    }
    case "durationDays": {
      const n = Number(v);
      if (!durations.includes(n)) return false;
      set("durationDays", n);
      return true;
    }
    case "locations":
      set("reach", { ...f.reach, locations: list(v) });
      return true;
    case "interests":
      if (SKIP.test(v)) {
        skippedOptional.add("interests");
        return true;
      }
      set("reach", { ...f.reach, interests: list(v) });
      return true;
    case "channels": {
      const w = v.toLowerCase();
      const channels = (["facebook", "instagram"] as const).filter((c) => w.includes(c) || w.includes("both"));
      if (!channels.length) return false;
      set("reach", {
        ...f.reach,
        channels: [...channels],
        budgetSplit: channels.length === 2 ? { facebook: 50, instagram: 50 } : { [channels[0]!]: 100 },
      });
      return true;
    }
    case "facebookPercent": {
      const n = Math.round(Number(v.replace(/[^0-9.]/g, "")));
      if (Number.isNaN(n) || f.reach.channels.length !== 2) return false;
      const fb = Math.min(100, Math.max(0, n));
      set("reach", { ...f.reach, budgetSplit: { facebook: fb, instagram: 100 - fb } });
      return true;
    }
    case "ageRange": {
      if (SKIP.test(v)) {
        skippedOptional.add("ageRange");
        return true;
      }
      const [lo, hi] = (v.match(/\d+/g) ?? []).map(Number);
      if (!lo) return false;
      const clamp = (n: number) => Math.min(65, Math.max(13, n));
      set("reach", { ...f.reach, ageMin: clamp(lo), ageMax: hi ? clamp(hi) : f.reach.ageMax });
      return true;
    }
    case "ageMin":
    case "ageMax": {
      const n = Math.round(Number(v.replace(/[^0-9]/g, "")));
      if (!n) return false;
      set("reach", { ...f.reach, [field]: Math.min(65, Math.max(13, n)) });
      return true;
    }
    default:
      return false;
  }
}
