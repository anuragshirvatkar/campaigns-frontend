// The moderation decision for the creator: what the review found and, when changes are requested,
// each thing to fix with a jump to the step where it's fixed.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import type { CampaignReview } from "@/api/types";
import { Text } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import type { IconName } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";

const STEP_NAMES = ["", "Basics", "Story", "Visuals", "Reach", "Submit"];

const LOOK: Record<CampaignReview["decision"], { title: string; icon: IconName; tone: "success" | "warning" | "danger" }> = {
  approved: { title: "Approved", icon: "checkmark-circle", tone: "success" },
  changes_requested: { title: "Changes requested", icon: "create", tone: "warning" },
  rejected: { title: "Not approved", icon: "close-circle", tone: "danger" },
};

export function ReviewCard({ review, onFix }: { review: CampaignReview; onFix?: (step: number) => void }) {
  const look = LOOK[review.decision];
  const fg = look.tone === "success" ? colors.success : look.tone === "warning" ? colors.warning : colors.danger;
  const bg = look.tone === "success" ? colors.successSoft : look.tone === "warning" ? colors.warningSoft : colors.dangerSoft;
  return (
    <View style={[styles.card, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <View style={styles.head}>
        <Ionicons name={look.icon} size={22} color={fg} />
        <View style={{ flex: 1 }}>
          <Text variant="title" color={fg}>
            {look.title}
          </Text>
          <Text variant="caption">
            {review.reviewer === "admin" ? "Reviewed by the Campaigns team" : review.reviewer === "ai" ? "Automated content review" : "Review checks"} ·{" "}
            {timeAgo(review.at)}
          </Text>
        </View>
      </View>
      <Text variant="bodySm" color={colors.text}>
        {review.summary}
      </Text>
      {review.issues.map((issue, i) => (
        <Pressable
          key={i}
          disabled={!onFix || review.decision === "rejected"}
          onPress={() => onFix?.(issue.step)}
          accessibilityRole={onFix && review.decision !== "rejected" ? "button" : undefined}
          style={({ pressed }) => [styles.issue, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.dot, { backgroundColor: fg }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodySm" color={colors.text}>
              {issue.message}
            </Text>
            {review.decision === "changes_requested" && (
              <Text variant="caption" color={onFix ? colors.primary : colors.textMuted}>
                {onFix ? `Fix in ${STEP_NAMES[issue.step] ?? "the editor"} ›` : `Step ${issue.step}: ${STEP_NAMES[issue.step]}`}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
      {review.decision === "rejected" && (
        <Text variant="caption">
          Rejected campaigns can’t be resubmitted. If you think this is a mistake, contact support from Help.
        </Text>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    issue: { flexDirection: "row", gap: spacing.sm, paddingVertical: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  }),
);
