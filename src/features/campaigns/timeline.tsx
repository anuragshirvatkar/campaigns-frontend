import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import type { TimelineStep } from "@/api/types";
import { Text } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { colors, spacing, themed } from "@/theme";

const EXPLAIN: Partial<Record<TimelineStep["key"], string>> = {
  submitted: "The platform checks the story, sources, visuals and targeting.",
  approved: "Approved campaigns are published for funding.",
  funding: "Backers fund the advertising that spreads the message.",
  funded: "Funding closes at the goal or the deadline. Ads don't start yet.",
  distribution_prep: "The platform sets up ads, placements and schedule.",
  promoting: "Ads run until the budget is spent. Delivery is reported.",
  completed: "The final distribution report is published.",
  cancelled: "Stopped before anyone backed it. It won't be funded or promoted.",
  changes_requested: "Fix what the review found, then resubmit. It goes through review again.",
  rejected: "It doesn't meet the campaign rules, so it won't be published.",
};

/**
 * Vertical lifecycle: done steps are filled, the current one is highlighted, future ones are hollow.
 * A cancelled or rejected campaign shows only the steps it went through, ending on a red step;
 * "Changes requested" ends on an amber one until it's resubmitted.
 */
export function StatusTimeline({
  steps: given,
  compact,
  cancelledAt,
}: {
  steps: TimelineStep[];
  compact?: boolean;
  /** Set for a cancelled campaign: adds the red final step if the server didn't send one */
  cancelledAt?: string | null;
}) {
  const steps: TimelineStep[] =
    cancelledAt !== undefined && !given.some((s) => s.key === "cancelled")
      ? [
          ...given,
          {
            key: "cancelled",
            label: "Cancelled",
            at: cancelledAt,
            isCurrent: true,
          },
        ]
      : given;
  const currentIndex = steps.findIndex((s) => s.isCurrent);
  // Ended, or paused for changes: only what happened is shown, nothing "upcoming"
  const halted = steps.some((s) => s.key === "cancelled" || s.key === "rejected" || s.key === "changes_requested");
  // Without a current step (e.g. an older server reply for a cancelled campaign) nothing lies ahead
  const shown = currentIndex === -1 || halted ? steps.filter((s) => s.at !== null || s.isCurrent) : steps;
  const current = shown.findIndex((s) => s.isCurrent);
  return (
    <View>
      {shown.map((s, i) => {
        const isCurrent = s.isCurrent;
        const done = !isCurrent && s.at !== null && (current === -1 || i < current);
        const stopped = isCurrent && (s.key === "cancelled" || s.key === "rejected");
        const paused = isCurrent && s.key === "changes_requested";
        const last = i === shown.length - 1;
        return (
          <View key={s.key} style={styles.row} accessibilityLabel={`${s.label}${isCurrent ? ", current step" : done ? ", done" : ""}`}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  done && styles.nodeDone,
                  isCurrent && styles.nodeCurrent,
                  stopped && styles.nodeStopped,
                  paused && styles.nodePaused,
                ]}
              >
                {done && <Ionicons name="checkmark" size={12} color={colors.textOnDark} />}
                {stopped ? (
                  <Ionicons name="close" size={13} color={colors.textOnDark} />
                ) : paused ? (
                  <Ionicons name="create" size={11} color={colors.textOnDark} />
                ) : (
                  isCurrent && <View style={styles.pulse} />
                )}
              </View>
              {!last && <View style={[styles.line, (done || isCurrent) && styles.lineDone]} />}
            </View>
            <View style={styles.content}>
              <Text
                variant="title"
                color={stopped ? colors.danger : paused ? colors.warning : done || isCurrent ? colors.text : colors.textSubtle}
              >
                {s.label}
              </Text>
              {s.at && <Text variant="caption">{dateTime(s.at)}</Text>}
              {!compact && (isCurrent || !s.at) && EXPLAIN[s.key] && (
                <Text variant="caption" color={isCurrent ? colors.textMuted : colors.textSubtle}>
                  {EXPLAIN[s.key]}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: spacing.md },
    rail: { alignItems: "center", width: 22 },
    node: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    nodeDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    nodeCurrent: { borderColor: colors.primary, borderWidth: 2 },
    nodeStopped: { backgroundColor: colors.danger, borderColor: colors.danger },
    nodePaused: { backgroundColor: colors.warning, borderColor: colors.warning },
    pulse: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: colors.border,
      marginVertical: 2,
      minHeight: 18,
    },
    lineDone: { backgroundColor: colors.primaryMuted },
    content: { flex: 1, paddingBottom: spacing.lg, gap: 2 },
  }),
);
