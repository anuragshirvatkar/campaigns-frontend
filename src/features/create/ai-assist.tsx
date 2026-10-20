// "Draft with AI": the creator describes the idea, AI proposes fields, the creator chooses to apply them.
// AI never sets sources or the funding goal, and everything stays editable afterwards.
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { platformApi } from "@/api/platform";
import type { AiDraft } from "@/api/types";
import { Button, Card, IconButton, Note, Text, TextField } from "@/components/ui";
import { CATEGORY } from "@/lib/labels";
import { colors, spacing, themed } from "@/theme";
import { localId, type DraftForm } from "./use-draft";

/** Turns an AI draft into form values. Story and ad fields only fill what's still empty. */
export function aiDraftToForm(d: AiDraft, current: DraftForm): Partial<DraftForm> {
  const keepIfSet = (cur: string, next: string) => (cur.trim() ? cur : next);
  return {
    title: d.title.slice(0, 60),
    category: d.category,
    creatorType: current.creatorType ?? d.creatorType,
    creatorDescription: keepIfSet(current.creatorDescription, d.creatorDescription ?? ""),
    summary: d.summary,
    targetAudience: d.targetAudience,
    whyItMatters: d.whyItMatters,
    storyHeadline: keepIfSet(current.storyHeadline, d.storyHeadline),
    storyIntro: keepIfSet(current.storyIntro, d.storyIntro),
    storyBlocks: current.storyBlocks.length ? current.storyBlocks : d.storyBlocks.map((b) => ({ ...b, id: localId("b") })),
    adHeadline: keepIfSet(current.adHeadline, d.adHeadline),
    adDescription: keepIfSet(current.adDescription, d.adDescription),
    ctaText: keepIfSet(current.ctaText, d.ctaText),
  };
}

export function AiAssistSheet({
  visible,
  onClose,
  form,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  form: DraftForm;
  onApply: (values: Partial<DraftForm>, questions: string[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(() => [form.summary, form.whyItMatters].filter(Boolean).join("\n"));
  const draft = useMutation({ mutationFn: () => platformApi.draft(text.trim()) });
  const result = draft.data;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text variant="h3" style={{ flex: 1 }}>
            {result ? "Your draft" : "Draft with AI"}
          </Text>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          {!result ? (
            <>
              <TextField
                label="Describe your idea"
                multiline
                minLines={7}
                value={text}
                onChangeText={setText}
                maxLength={8000}
                placeholder="What it's about, who should see it, why it matters and what backs it up."
                error={draft.isError ? (draft.error instanceof ApiError ? draft.error.message : "AI is unavailable right now.") : null}
                hint="AI suggests the title, summary, story and ad text. It never adds sources or sets your goal."
              />
              <Button label="Write my draft" icon="sparkles" block loading={draft.isPending} disabled={text.trim().length < 20} onPress={() => draft.mutate()} />
            </>
          ) : (
            <>
              {result.mode === "demo" && <Note tone="warning">AI is unavailable, so this is a sample. Edit it to fit your campaign.</Note>}
              <Card padded={false} style={{ overflow: "hidden" }}>
                <Suggestion label="Title" value={result.draft.title} first />
                <Suggestion label="Category" value={CATEGORY[result.draft.category]?.label ?? result.draft.category} />
                <Suggestion label="Summary" value={result.draft.summary} />
                <Suggestion label="Who it should reach" value={result.draft.targetAudience} />
                <Suggestion label="Why it matters" value={result.draft.whyItMatters} />
                <Suggestion label="Story headline" value={result.draft.storyHeadline} />
                <Suggestion label="Ad headline" value={result.draft.adHeadline} />
              </Card>
              <View style={{ gap: spacing.sm }}>
                <Button
                  label="Use this draft"
                  icon="checkmark"
                  block
                  onPress={() => {
                    onApply(aiDraftToForm(result.draft, form), result.draft.followUpQuestions);
                    draft.reset();
                    onClose();
                  }}
                />
                <Button label="Try again" variant="ghost" block onPress={() => draft.reset()} />
              </View>
              <Text variant="caption" align="center">
                Anything you already wrote in the story or ad is kept.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Suggestion({ label, value, first }: { label: string; value: string; first?: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.suggestion, !first && styles.divider]}>
      <Text variant="caption">{label}</Text>
      <Text variant="body" numberOfLines={6}>
        {value}
      </Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  body: { padding: spacing.xl, gap: spacing.xl },
  suggestion: { gap: 2, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
}));
