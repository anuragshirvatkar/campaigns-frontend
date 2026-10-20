// A followed campaign, as shown on the Following screen and Activity's Following tab. The footer says
// what's next for the campaign (time left, live delivery, final report) and has a bell to unfollow.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { engageApi } from "@/api/engage";
import { keys } from "@/api/queries";
import type { FollowedCampaign } from "@/api/types";
import { Text, useToast } from "@/components/ui";
import { meQueryKey } from "@/features/auth/auth-provider";
import { openCampaign } from "@/features/campaigns/campaign-card";
import { CampaignListCard } from "@/features/campaigns/campaign-parts";
import { money, percent, timeLeft } from "@/lib/format";
import { STATUS, type IconName } from "@/lib/labels";
import { colors, fonts, spacing, themed } from "@/theme";
import { showAlert } from "@/components/ui/alert-dialog";

const SOON_MS = 3 * 86_400_000; // deadline counts as close inside three days

type Next = { icon: IconName; text: string; color: string; onPress?: () => void };

/** What a follower most wants to know right now, given the campaign's stage. */
function nextStep(c: FollowedCampaign): Next {
  const report = () => router.push({ pathname: "/campaign/[id]/report", params: { id: c.slug ?? c.id } });
  switch (c.status) {
    case "funding": {
      const soon = !!c.funding.deadline && new Date(c.funding.deadline).getTime() - Date.now() < SOON_MS;
      return {
        icon: "time-outline",
        text: timeLeft(c.funding.deadline) ?? "Funding open",
        color: soon ? colors.warning : colors.textMuted,
      };
    }
    case "promoting":
      return { icon: "pulse-outline", text: "Ads running · see live delivery", color: colors.primary, onPress: report };
    case "completed":
      return { icon: "bar-chart-outline", text: "Final report ready", color: colors.primary, onPress: report };
    case "cancelled":
      return { icon: "close-circle-outline", text: "Cancelled", color: colors.danger };
    default:
      return { icon: "hourglass-outline", text: STATUS[c.status].label, color: colors.textMuted };
  }
}

export function FollowedCampaignCard({ c }: { c: FollowedCampaign }) {
  const qc = useQueryClient();
  const toast = useToast();
  const next = nextStep(c);

  const unfollow = useMutation({
    mutationFn: () => engageApi.unfollow(c.id),
    // Drop it from the list straight away; put it back if the request fails
    onMutate: () => {
      const before = qc.getQueryData<FollowedCampaign[]>(keys.following);
      qc.setQueryData<FollowedCampaign[]>(keys.following, (old) => old?.filter((x) => x.id !== c.id));
      return { before };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(keys.following, ctx?.before);
      toast("Couldn't unfollow. Try again.", "error");
    },
    onSuccess: () => toast("Unfollowed"),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.following });
      void qc.invalidateQueries({ queryKey: ["campaign"] });
      void qc.invalidateQueries({ queryKey: meQueryKey });
    },
  });

  const confirm = () =>
    showAlert("Unfollow this campaign?", "You'll stop getting its milestones, updates and final report.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unfollow", style: "destructive", onPress: () => unfollow.mutate() },
    ]);

  const label = (
    <>
      <Ionicons name={next.icon} size={15} color={next.color} />
      <Text
        variant="caption"
        color={next.color}
        numberOfLines={1}
        style={{ flexShrink: 1, fontFamily: next.onPress ? fonts.semibold : fonts.regular }}
      >
        {next.text}
      </Text>
      {next.onPress && <Ionicons name="chevron-forward" size={14} color={next.color} />}
    </>
  );

  return (
    <CampaignListCard
      title={c.title}
      imageUrl={c.squareImageUrl ?? c.coverImageUrl}
      progress={c.funding.percentFunded}
      progressLabel={`${money(c.funding.raisedCents)} of ${money(c.funding.goalCents)}`}
      progressValue={percent(c.funding.percentFunded)}
      onPress={() => openCampaign(c)}
      footer={
        <>
          {next.onPress ? (
            <Pressable accessibilityRole="link" onPress={next.onPress} hitSlop={8} style={styles.next}>
              {label}
            </Pressable>
          ) : (
            <View style={styles.next}>{label}</View>
          )}
          {/* Same pill as on the campaign page: shows you follow it, tap to unfollow */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Following. Tap to unfollow"
            onPress={confirm}
            hitSlop={6}
            style={({ pressed }) => [styles.follow, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="checkmark" size={15} color={colors.text} />
            <Text variant="title" style={{ fontSize: 13 }}>
              Following
            </Text>
          </Pressable>
        </>
      }
    />
  );
}

const styles = themed(() => StyleSheet.create({
  follow: { flexDirection: "row", alignItems: "center", gap: 4, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surfaceAlt },
  next: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36, paddingRight: spacing.sm },
}));
