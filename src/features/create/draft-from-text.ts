// Turns someone's description of a campaign into a saved draft written by AI (used by
// "Create with voice" and by Sam). Returns the draft, ready to open in the editor.
import { campaignsApi } from "@/api/campaigns";
import { platformApi } from "@/api/platform";
import { aiDraftToForm } from "./ai-assist";
import { aiNotes } from "./ai-notes";
import { formFromCampaign } from "./use-draft";

export async function draftFromText(idea: string) {
  const campaign = await campaignsApi.create("voice");
  const { mode, draft } = await platformApi.draft(idea.trim());
  const v = aiDraftToForm(draft, formFromCampaign(campaign));
  const text = (s: string | undefined) => (s?.trim() ? s : null);
  const updated = await campaignsApi.update(campaign.id, {
    title: text(v.title),
    category: v.category ?? null,
    creatorType: v.creatorType ?? null,
    creatorDescription: text(v.creatorDescription),
    summary: text(v.summary),
    targetAudience: text(v.targetAudience),
    whyItMatters: text(v.whyItMatters),
    storyHeadline: text(v.storyHeadline),
    storyIntro: text(v.storyIntro),
    storyBlocks: v.storyBlocks ?? [],
    adHeadline: text(v.adHeadline),
    adDescription: text(v.adDescription),
    ctaText: text(v.ctaText),
  });
  const notes = [...draft.followUpQuestions];
  if (mode === "demo") notes.unshift("AI was unavailable, so this is a demo draft. Replace it with your own details.");
  aiNotes.set(updated.id, notes);
  return updated;
}
