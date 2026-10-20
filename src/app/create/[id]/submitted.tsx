import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useMyCampaign } from "@/api/queries";
import { Button, Card, ResultAnimation, Screen, StatusPill, Text } from "@/components/ui";
import { ReviewCard } from "@/features/campaigns/review-card";
import { StatusTimeline } from "@/features/campaigns/timeline";
import { STATUS } from "@/lib/labels";
import { shareCampaign } from "@/lib/share";
import { colors, spacing } from "@/theme";

export default function SubmittedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Review is automatic in this demo: this re-checks every few seconds while it's in review, and the
  // moment it goes live every other screen (My campaigns, Explore, Activity) refreshes too
  const { data: c } = useMyCampaign(id);
  const live = c?.status === "funding";
  const changes = c?.status === "changes_requested";
  const rejected = c?.status === "rejected";
  const fix = (step?: number) => router.replace({ pathname: "/create/[id]", params: { id, ...(step ? { step: String(step) } : {}) } });

  return (
    <Screen safeTop>
      <View style={{ marginTop: spacing.xl }}>
        {/* Keyed so the animation replays when the decision arrives */}
        <ResultAnimation key={c?.status} kind={rejected ? "failure" : "success"} />
      </View>
      <Text variant="h1" align="center">
        {live ? "Your campaign is live" : changes ? "A few changes needed" : rejected ? "Not approved" : "Submitted for review"}
      </Text>
      <Text variant="body" align="center" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
        {live
          ? "Backers can now fund its reach. Share it to get the first contributions."
          : changes
            ? "Review found a few things to fix. Make the changes and resubmit."
            : rejected
              ? "This campaign doesn't meet the campaign rules, so it won't be published."
              : "We check the story, sources, visuals and targeting against the campaign rules. In this demo it takes about 20 seconds."}
      </Text>

      {(changes || rejected) && c?.review && (
        <View style={{ marginTop: spacing.xl }}>
          <ReviewCard review={c.review} onFix={changes ? fix : undefined} />
        </View>
      )}

      {c && (
        <Card style={{ marginTop: spacing.xxl, gap: spacing.lg }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
            <Text variant="title" numberOfLines={2} style={{ flex: 1 }}>
              {c.title}
            </Text>
            <StatusPill status={c.status} />
          </View>
          <Text variant="caption">{STATUS[c.status].explain}</Text>
          <StatusTimeline steps={c.timeline} />
        </Card>
      )}

      <View style={{ gap: spacing.sm, marginTop: spacing.xxl }}>
        {live && c && <Button label="Share campaign" icon="share-social-outline" block onPress={() => shareCampaign(c)} />}
        {changes && <Button label="Fix and resubmit" icon="create-outline" block onPress={() => fix()} />}
        <Button
          label="Manage campaign"
          variant={live || changes ? "ghost" : "primary"}
          block
          onPress={() => router.replace({ pathname: "/manage/[id]", params: { id } })}
        />
        <Button label="Back to home" variant="ghost" block onPress={() => router.dismissTo("/")} />
      </View>
    </Screen>
  );
}

