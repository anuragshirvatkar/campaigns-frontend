import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { CreatorType } from "@/api/types";
import { Chip, Text, TextField } from "@/components/ui";
import { CATEGORIES, CATEGORY, CREATOR_TYPE } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";
import { AiAssistSheet } from "./ai-assist";
import { FieldGroup, FormSection, ImageField, StepIntro } from "./form-parts";
import type { DraftForm, FieldErrors } from "./use-draft";

type Props = {
  form: DraftForm;
  set: <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => void;
  setMany: (v: Partial<DraftForm>) => void;
  errors: FieldErrors;
  aiQuestions: string[];
  setAiQuestions: (q: string[]) => void;
};

/** Description for AI images, built from what the creator has written so far. */
export function imageSuggestion(form: DraftForm) {
  const title = form.title.trim();
  const summary = form.summary.trim();
  if (!title || !summary) return title || summary;
  return /[.!?]$/.test(title) ? `${title} ${summary}` : `${title}. ${summary}`;
}

export function StepBasics({ form, set, setMany, errors, aiQuestions, setAiQuestions }: Props) {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <View style={{ gap: spacing.xxl }}>
      <StepIntro
        title="What's it about?"
        body="The message, who it's from and who it's for."
        action={{ label: "Use AI", onPress: () => setAiOpen(true) }}
      />

      {aiQuestions.length > 0 && (
        <View style={styles.questions}>
          <View style={styles.questionsHead}>
            <Ionicons name="bulb" size={14} color={colors.primary} />
            <Text variant="title" style={{ flex: 1, fontSize: 14 }}>
              Review the AI draft. Worth adding:
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => setAiQuestions([])} hitSlop={10}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {aiQuestions.map((q) => (
            <Text key={q} variant="bodySm" color={colors.text}>
              • {q}
            </Text>
          ))}
        </View>
      )}

      <FormSection label="Campaign">
        <TextField
          label="Title"
          required
          value={form.title}
          onChangeText={(v) => set("title", v)}
          maxLength={60}
          showCounter
          placeholder="e.g. Plant more shade trees along school routes"
          error={errors.title}
          hint="Its start becomes the ad headline if you don't write one."
        />
        <FieldGroup title="Category" required error={errors.category}>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                size="sm"
                icon={CATEGORY[c].icon}
                label={CATEGORY[c].label}
                selected={form.category === c}
                onPress={() => set("category", c)}
              />
            ))}
          </View>
        </FieldGroup>
      </FormSection>

      <FormSection label="Creator">
        <TextField
          label="Name or organization"
          required
          value={form.creatorName}
          onChangeText={(v) => set("creatorName", v)}
          maxLength={80}
          error={errors.creatorName}
        />
        <FieldGroup title="Creating as">
          <View style={styles.wrap}>
            {(Object.keys(CREATOR_TYPE) as CreatorType[]).map((t) => (
              <Chip
                key={t}
                size="sm"
                label={CREATOR_TYPE[t]}
                selected={form.creatorType === t}
                onPress={() => set("creatorType", form.creatorType === t ? null : t)}
              />
            ))}
          </View>
        </FieldGroup>
        <TextField
          label="About you (optional)"
          value={form.creatorDescription}
          onChangeText={(v) => set("creatorDescription", v)}
          maxLength={300}
          multiline
          minLines={2}
          placeholder="One or two lines"
        />
      </FormSection>

      <FormSection label="Message">
        <TextField
          label="Short summary"
          required
          value={form.summary}
          onChangeText={(v) => set("summary", v)}
          maxLength={300}
          showCounter
          multiline
          minLines={3}
          error={errors.summary}
          placeholder="The message, in a sentence or two"
        />
        <TextField
          label="Who should it reach?"
          value={form.targetAudience}
          onChangeText={(v) => set("targetAudience", v)}
          maxLength={300}
          multiline
          minLines={2}
          placeholder="e.g. Parents in Austin, 28–55"
        />
        <TextField
          label="Why does it matter?"
          value={form.whyItMatters}
          onChangeText={(v) => set("whyItMatters", v)}
          maxLength={1000}
          multiline
          minLines={3}
          placeholder="What changes if more people see this?"
          hint="You'll add evidence in the next step."
        />
      </FormSection>

      <FieldGroup title="Cover image" required hint="Shown on the campaign card and at the top of its page." error={errors.coverImageUrl}>
        <ImageField
          url={form.coverImageUrl}
          onChange={(u) => set("coverImageUrl", u)}
          purpose="cover"
          label="cover image"
          hint="Wide image, at least 1200 × 630"
          generate={{ kind: "cover", suggestion: imageSuggestion(form) }}
        />
      </FieldGroup>

      <AiAssistSheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        form={form}
        onApply={(values, questions) => {
          setMany(values);
          setAiQuestions(questions);
        }}
      />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  questions: { gap: 6, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primaryTint },
  questionsHead: { flexDirection: "row", alignItems: "center", gap: 6 },
}));
