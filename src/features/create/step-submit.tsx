// Submit: complete summary, the creator-set funding goal, fees and policies, rules confirmation,
// and anything still missing with a jump back to the right step.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { OwnerCampaign, PlatformConfig } from "@/api/types";
import { Card, Divider, Expandable, KeyValue, Note, Text, TextField } from "@/components/ui";
import { FundsSplit } from "@/features/campaigns/explainers";
import { estimateReach, money, parseDollars, reachRange } from "@/lib/format";
import { CATEGORY, CHANNEL } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";
import { CheckRow, StepIntro } from "./form-parts";
import type { DraftForm, FieldErrors } from "./use-draft";

type Props = {
  form: DraftForm;
  set: <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => void;
  errors: FieldErrors;
  config: PlatformConfig;
  readiness: OwnerCampaign["readiness"] | undefined;
  goToStep: (step: number) => void;
};

const STEP_NAMES = ["About", "Story", "Visuals", "Reach", "Submit"];

export function StepSubmit({ form, set, errors, config, readiness, goToStep }: Props) {
  const [goalText, setGoalText] = useState(form.fundingGoalCents ? String(form.fundingGoalCents / 100) : "");
  const { minGoalCents, maxGoalCents } = config.funding;
  const typed = parseDollars(goalText);
  // A goal set from outside the field (Sam heard it) shows up in the field too
  const [seenGoal, setSeenGoal] = useState(form.fundingGoalCents);
  if (form.fundingGoalCents !== seenGoal) {
    setSeenGoal(form.fundingGoalCents);
    if (form.fundingGoalCents !== null && form.fundingGoalCents !== typed) setGoalText(String(form.fundingGoalCents / 100));
  }
  const inRange = (cents: number | null) => cents !== null && cents >= minGoalCents && cents <= maxGoalCents;
  // Only a valid goal is stored (and autosaved); the field keeps what was typed
  const goal = inRange(typed) ? typed : null;
  const goalError =
    goalText && !inRange(typed) ? `Choose between ${money(minGoalCents)} and ${money(maxGoalCents)}.` : errors.fundingGoalCents;
  const reach = goal ? estimateReach(goal, config.reach.reachPerDollar, config.reach.estimateRangePct) : null;
  const adBudget = goal ? goal - Math.round((goal * config.fees.platformFeePct) / 100) : 0;
  const r = form.reach;
  // Issues from earlier steps (this step's own fields are validated live below)
  const otherIssues = readiness?.issues.filter((i) => i.step !== 5) ?? [];

  return (
    <View style={{ gap: spacing.xl }}>
      <StepIntro title="Submit" body="Check everything, set your goal and send it for review." />

      {/* Summary */}
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Image source={form.coverImageUrl ? { uri: form.coverImageUrl } : null} style={styles.thumb} contentFit="cover" />
          <View style={{ flex: 1, gap: 2 }}>
            {form.category && (
              <Text variant="overline" color={CATEGORY[form.category].tint}>
                {CATEGORY[form.category].label}
              </Text>
            )}
            <Text variant="title" numberOfLines={2}>
              {form.title || "Untitled campaign"}
            </Text>
            <Text variant="caption">by {form.creatorName || "—"}</Text>
          </View>
        </View>
        {!!form.summary && <Text variant="bodySm">{form.summary}</Text>}
        <Divider />
        <SummaryRow step={1} label="About" value={form.targetAudience || "Audience not described"} onEdit={goToStep} />
        <SummaryRow
          step={2}
          label="Story & sources"
          value={`${form.storyBlocks.length} section${form.storyBlocks.length === 1 ? "" : "s"} · ${form.sources.length} source${form.sources.length === 1 ? "" : "s"}`}
          onEdit={goToStep}
        />
        <SummaryRow
          step={3}
          label="Visuals"
          value={`${form.coverImageUrl ? "Cover" : "No cover"} · ${form.adAssets.length} ad creative${form.adAssets.length === 1 ? "" : "s"}`}
          onEdit={goToStep}
        />
        <SummaryRow
          step={4}
          label="Reach"
          value={`${r.locations.join(", ") || "No locations"} · ${r.channels.map((c) => CHANNEL[c]?.label).join(" & ") || "No channels"} · ${form.durationDays ?? 30} days`}
          onEdit={goToStep}
        />
      </Card>

      {/* Funding goal — set only here, by the creator */}
      <View style={{ gap: spacing.md }}>
        <TextField
          label="Funding goal"
          required
          prefix="$"
          value={goalText}
          onChangeText={(v) => {
            setGoalText(v);
            const cents = parseDollars(v);
            set("fundingGoalCents", inRange(cents) ? cents : null);
          }}
          keyboardType="decimal-pad"
          placeholder="e.g. 5000"
          error={goalError}
          hint={`The advertising budget you're asking backers for. ${money(minGoalCents)}–${money(maxGoalCents)}. Only you set this; AI never does.`}
        />
        {goal ? (
          <Card style={{ gap: spacing.md }}>
            <View style={styles.reachRow}>
              <Ionicons name="people" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="overline">Estimated reach at goal</Text>
                <Text variant="h2" color={colors.primary}>
                  {reachRange(reach)} people
                </Text>
              </View>
            </View>
            <FundsSplit adSharePct={100 - config.fees.platformFeePct} platformFeePct={config.fees.platformFeePct} />
            <KeyValue label="Ad budget if fully funded" value={money(adBudget)} />
            <KeyValue label="Platform fee" value={money(goal - adBudget)} />
            <Text variant="caption">{config.reach.disclaimer}</Text>
          </Card>
        ) : null}
      </View>

      <Expandable icon="document-text-outline" title="Fees and funding policies" initiallyOpen>
        <Policy>{`Backers' contributions fund advertising for your message. You don't receive the money; the platform spends it on distribution.`}</Policy>
        <Policy>{`${config.fees.platformFeePct}% platform fee covers review, ad setup, delivery and reporting. Backers pay ~${config.fees.processingFeePct}% card processing on top.`}</Policy>
        <Policy>{`Keep what you raise: if the goal isn't met by the deadline, what was raised still promotes your campaign.`}</Policy>
        <Policy>{`Contributions aren't refundable once paid, because they're committed to promotion.`}</Policy>
        <Policy>{`You can cancel only before anyone backs the campaign. Edits after approval send it back to review; editing locks once it's fully funded.`}</Policy>
      </Expandable>

      <CheckRow
        checked={form.rulesAccepted}
        onToggle={() => set("rulesAccepted", !form.rulesAccepted)}
        error={errors.rulesAccepted}
      >
        <Text variant="body">
          I confirm this campaign follows the community guidelines and advertising rules, its claims are supported by the listed
          sources, and I accept the funding policies above.
        </Text>
      </CheckRow>

      {otherIssues.length > 0 && (
        <Card tone="flat" style={{ gap: spacing.sm, borderWidth: 1, borderColor: colors.dangerSoft }}>
          <Text variant="title" color={colors.danger}>
            Still needed before you can submit
          </Text>
          {otherIssues.map((i) => (
            <Pressable key={i.field + i.message} accessibilityRole="button" onPress={() => goToStep(i.step)} style={styles.issue}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text variant="bodySm" color={colors.text} style={{ flex: 1 }}>
                {i.message}
              </Text>
              <Text variant="caption" color={colors.primary}>
                {STEP_NAMES[i.step - 1]} →
              </Text>
            </Pressable>
          ))}
        </Card>
      )}
      {readiness && readiness.warnings.length > 0 && (
        <Note tone="warning">
          <View style={{ gap: 4 }}>
            <Text variant="title" style={{ fontSize: 14 }}>
              Optional, but recommended
            </Text>
            {readiness.warnings.map((w) => (
              <Text key={w.field} variant="bodySm" color={colors.text} onPress={() => goToStep(w.step)}>
                • {w.message}
              </Text>
            ))}
          </View>
        </Note>
      )}
    </View>
  );
}

function SummaryRow({ step, label, value, onEdit }: { step: number; label: string; value: string; onEdit: (s: number) => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label}`}
      onPress={() => onEdit(step)}
      style={styles.summaryRow}
    >
      <View style={styles.stepNum}>
        <Text variant="caption" color={colors.primary} style={{ fontFamily: "Rubik_600SemiBold" }}>
          {step}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" style={{ fontSize: 14 }}>
          {label}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Ionicons name="create-outline" size={18} color={colors.primary} />
    </Pressable>
  );
}

function Policy({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
      <Text variant="bodySm" color={colors.text} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 6, minHeight: 48 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  reachRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  issue: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40 },
}));
