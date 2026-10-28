// Manage one campaign: status, milestones, analytics (estimates kept apart from measured delivery),
// updates to backers, and the actions the current status allows.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "@/components/ui/alert-dialog";
import { campaignsApi } from "@/api/campaigns";
import { ApiError } from "@/api/client";
import { keys, useAnalytics, useMyCampaign, useUpdates } from "@/api/queries";
import type { Analytics, FeedbackTally, OwnerCampaign } from "@/api/types";
import {
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingState,
  Note,
  ProgressRing,
  Screen,
  SectionHeader,
  StatusPill,
  Text,
  TextField,
  useToast,
} from "@/components/ui";
import { EstimateVsMeasured, FundsBreakdown, MeasuredTiles, MetricTile } from "@/features/campaigns/report-parts";
import { ReviewCard } from "@/features/campaigns/review-card";
import { StatusTimeline } from "@/features/campaigns/timeline";
import { CampaignPreviewModal } from "@/features/create/campaign-preview";
import { formFromCampaign } from "@/features/create/use-draft";
import { date, money, percent, reachRange, timeAgo, timeLeft } from "@/lib/format";
import type { IconName } from "@/lib/labels";
import { STATUS } from "@/lib/labels";
import { shareCampaign } from "@/lib/share";
import { goBackOr } from "@/lib/nav";
import { colors, radius, spacing, themed } from "@/theme";
import { PressScale } from "@/components/ui/motion";

const PUBLIC = ["funding", "funded", "funding_ended", "distribution_prep", "promoting", "completed"];

export default function ManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useMyCampaign(id);
  const c = query.data;
  const analytics = useAnalytics(id, !!c && c.status !== "draft");

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <ManageView
      c={query.data}
      a={analytics.data}
      refreshing={query.isRefetching || analytics.isRefetching}
      onRefresh={() => {
        void query.refetch();
        void analytics.refetch();
      }}
    />
  );
}

function ManageView({
  c,
  a,
  refreshing,
  onRefresh,
}: {
  c: OwnerCampaign;
  a: Analytics | undefined;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [preview, setPreview] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const isPublic = PUBLIC.includes(c.status);
  const updates = useUpdates(isPublic ? c.id : undefined);
  const milestones = [25, 50, 75, 100];
  const reached = a?.funding.milestonesReached ?? milestones.filter((m) => c.funding.percentFunded >= m);
  // Never went live (or is between reviews): funding, analytics and budget don't apply yet
  const neverLive = ["draft", "submitted", "changes_requested", "rejected", "cancelled"].includes(c.status) && !c.publishedAt;
  const canCancel = ["submitted", "changes_requested", "approved", "funding"].includes(c.status) && c.funding.backerCount === 0;
  // Drafts and rejected campaigns can be deleted outright
  const canDelete = c.status === "draft" || c.status === "rejected";
  const openEditor = (step?: number) =>
    router.push({ pathname: "/create/[id]", params: { id: c.id, ...(step ? { step: String(step) } : {}) } });

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: keys.myCampaign(c.id) });
    void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
    void qc.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const cancel = useMutation({
    mutationFn: () => campaignsApi.cancel(c.id),
    onSuccess: () => {
      toast("Campaign cancelled");
      refreshAll();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't cancel.", "error"),
  });
  const remove = useMutation({
    mutationFn: () => campaignsApi.remove(c.id),
    onSuccess: () => {
      toast("Draft deleted");
      void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      goBackOr("/my-campaigns");
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't delete.", "error"),
  });

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={c.coverImageUrl ? { uri: c.coverImageUrl } : null} style={styles.cover} contentFit="cover" />
        <View style={{ flex: 1, gap: 6 }}>
          <StatusPill status={c.status} />
          <Text variant="h3" numberOfLines={3}>
            {c.title || "Untitled campaign"}
          </Text>
        </View>
      </View>
      <Note tone={STATUS[c.status].tone === "danger" ? "danger" : STATUS[c.status].tone === "warning" ? "warning" : "info"}>
        {STATUS[c.status].explain}
      </Note>

      {/* Actions */}
      <Actions
        items={[
          c.isEditable && {
            icon: "create-outline",
            label: c.status === "draft" ? "Continue editing" : c.status === "changes_requested" ? "Fix and resubmit" : "Edit",
            onPress: () => openEditor(),
          },
          {
            icon: "eye-outline",
            label: isPublic ? "Public page" : "Preview",
            onPress: () =>
              isPublic
                ? router.push({
                    pathname: "/campaign/[id]",
                    params: { id: c.slug ?? c.id },
                  })
                : setPreview(true),
          },
          isPublic && {
            icon: "share-social-outline",
            label: "Share",
            onPress: () => shareCampaign(c),
          },
          isPublic && {
            icon: "newspaper-outline",
            label: "Post update",
            onPress: () => setUpdateOpen(true),
          },
          (c.status === "promoting" || c.status === "completed") && {
            icon: "bar-chart-outline",
            label: c.status === "completed" ? "Final report" : "Live report",
            onPress: () =>
              router.push({
                pathname: "/campaign/[id]/report",
                params: { id: c.slug ?? c.id },
              }),
          },
        ]}
      />

      {/* Funding */}
      {/* The review decision comes first when there's something to act on */}
      {(c.status === "changes_requested" || c.status === "rejected") && c.review && (
        <View style={{ marginTop: spacing.lg }}>
          <ReviewCard review={c.review} onFix={c.status === "changes_requested" ? openEditor : undefined} />
        </View>
      )}

      {!neverLive && (
        <View style={styles.section}>
          <SectionHeader overline="Funding" title="Progress & milestones" />
          <Card style={styles.fundingCard}>
            <ProgressRing value={c.funding.percentFunded} size={118} stroke={12}>
              <Text variant="h2" color={colors.primary}>
                {percent(c.funding.percentFunded)}
              </Text>
              <Text variant="caption">funded</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <View>
                <Text variant="number">{money(c.funding.raisedCents)}</Text>
                <Text variant="caption">of {money(c.funding.goalCents)} goal</Text>
              </View>
              <Text variant="bodySm">
                {c.status === "funding" ? timeLeft(c.funding.deadline) : `Deadline ${date(c.funding.deadline)}`} · {c.durationDays ?? "—"}
                -day period
              </Text>
              <Text variant="caption">Est. reach at goal: {reachRange(c.funding.estimatedReachAtGoal)}</Text>
            </View>
          </Card>
          <View style={styles.milestones}>
            {milestones.map((m) => {
              const hit = reached.includes(m);
              return (
                <View
                  key={m}
                  style={[styles.milestone, hit && styles.milestoneHit]}
                  accessibilityLabel={`${m}% milestone ${hit ? "reached" : "not reached"}`}
                >
                  <Ionicons name={hit ? "flag" : "flag-outline"} size={16} color={hit ? colors.textOnDark : colors.textSubtle} />
                  <Text variant="title" color={hit ? colors.textOnDark : colors.textMuted} style={{ fontSize: 13 }}>
                    {m}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Analytics (nothing to measure once cancelled) */}
      {a && !neverLive && (
        <View style={styles.section}>
          <SectionHeader overline="Analytics" title="Backers & activity" />
          <View style={styles.tiles}>
            <MetricTile
              label="Backers"
              value={String(a.funding.backerCount)}
              sub={`${a.funding.contributionCount} contributions`}
              icon="people-outline"
              bg={colors.primary}
            />
            <MetricTile
              label="Followers"
              value={String(a.funding.followerCount)}
              sub="get your updates"
              icon="notifications-outline"
              bg={colors.teal}
            />
          </View>
          {a.funding.fundingOverTime.length > 0 && <FundingBars data={a.funding.fundingOverTime} />}

          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader overline="Advertising" title="Budget allocated & spent" />
            <FundsBreakdown r={a} />
          </View>

          {a.hasDelivery ? (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <SectionHeader overline="Measured · simulated ad platform" title="Delivery" />
              <MeasuredTiles r={a} />
              <EstimateVsMeasured r={a} />
            </View>
          ) : (
            <Card tone="flat" style={{ marginTop: spacing.lg, gap: 4 }}>
              <Text variant="title">Estimated reach for what’s raised</Text>
              <Text variant="h2" color={colors.primary}>
                {reachRange(a.estimate.reachForRaised)} people
              </Text>
              <Text variant="caption">Estimate only. Measured impressions, reach and clicks appear once promotion starts.</Text>
            </Card>
          )}

          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader overline="Reader feedback" title="How the message lands" />
            <FeedbackBars label="Visuals encouraged reading" t={a.feedback.visuals} />
            <FeedbackBars label="Message changed their mind" t={a.feedback.changedMind} />
          </View>
        </View>
      )}

      {/* Timeline + review */}
      {c.timeline.length > 0 && (
        <View style={styles.section}>
          <SectionHeader overline="Lifecycle" title="Status timeline" />
          <StatusTimeline
            steps={c.timeline}
            // A cancelled campaign can't be edited, so its last update is when it was cancelled
            cancelledAt={c.status === "cancelled" ? c.updatedAt : undefined}
          />
          {c.status === "submitted" ? (
            <Card tone="flat" style={{ gap: 4 }}>
              <Text variant="title">Moderation feedback</Text>
              <Text variant="bodySm">
                In review. The Campaigns team is checking the content, sources, visuals and targeting against the campaign rules. You’ll be notified of the decision.
              </Text>
            </Card>
          ) : (
            c.review &&
            c.status !== "cancelled" &&
            c.status !== "changes_requested" &&
            c.status !== "rejected" && <ReviewCard review={c.review} />
          )}
        </View>
      )}

      {/* Updates */}
      {isPublic && (
        <View style={styles.section}>
          <SectionHeader
            overline="Keep backers in the loop"
            title={`Updates (${updates.data?.length ?? 0})`}
            action="Post update"
            onAction={() => setUpdateOpen(true)}
          />
          {(updates.data ?? []).map((u) => (
            <View key={u.id} style={styles.update}>
              <Text variant="caption">{timeAgo(u.createdAt)}</Text>
              <Text variant="title">{u.title}</Text>
              <Text variant="bodySm" color={colors.text} numberOfLines={4}>
                {u.body}
              </Text>
            </View>
          ))}
          {updates.data?.length === 0 && (
            <Text variant="bodySm">No updates yet. Followers and backers are notified when you post one.</Text>
          )}
        </View>
      )}

      {/* Danger zone */}
      {(canCancel || canDelete) && (
        <View style={styles.section}>
          {canDelete ? (
            <Button
              label={c.status === "draft" ? "Delete draft" : "Delete campaign"}
              variant="danger"
              icon="trash-outline"
              loading={remove.isPending}
              onPress={() =>
                showAlert(c.status === "draft" ? "Delete this draft?" : "Delete this campaign?", "This can't be undone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => remove.mutate(),
                  },
                ])
              }
            />
          ) : (
            <Button
              label="Cancel campaign"
              variant="danger"
              icon="close-circle-outline"
              loading={cancel.isPending}
              onPress={() =>
                showAlert(
                  "Cancel this campaign?",
                  "It will stop accepting contributions and won't be promoted. This is only possible before anyone backs it.",
                  [
                    { text: "Keep it", style: "cancel" },
                    {
                      text: "Cancel campaign",
                      style: "destructive",
                      onPress: () => cancel.mutate(),
                    },
                  ],
                )
              }
            />
          )}
        </View>
      )}

      <CampaignPreviewModal visible={preview} onClose={() => setPreview(false)} form={formFromCampaign(c)} />
      <PostUpdateSheet visible={updateOpen} onClose={() => setUpdateOpen(false)} campaignId={c.id} />
    </Screen>
  );
}

type ActionItem = { icon: IconName; label: string; onPress: () => void };

/** One action is a plain full-width button; more sit in an even grid (2×2 for four, otherwise up to three across). */
function Actions({ items }: { items: (ActionItem | false)[] }) {
  const { width } = useWindowDimensions();
  const list = items.filter((x): x is ActionItem => !!x);
  if (list.length === 1) {
    const [only] = list;
    return <Button label={only.label} icon={only.icon} variant="outline" onPress={only.onPress} style={{ marginTop: spacing.lg }} />;
  }
  const columns = list.length === 4 ? 2 : Math.min(list.length, 3);
  const tile = (width - spacing.xl * 2 - spacing.sm * (columns - 1)) / columns;
  return (
    <View style={styles.actions}>
      {list.map((x) => (
        <Action key={x.label} {...x} width={tile} />
      ))}
    </View>
  );
}

function Action({ icon, label, onPress, width }: ActionItem & { width: number }) {
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, { width }, pressed && { backgroundColor: colors.primarySoft }]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text variant="caption" color={colors.text} align="center" style={{ fontFamily: "Rubik_500Medium" }}>
        {label}
      </Text>
    </PressScale>
  );
}

function FundingBars({ data }: { data: Analytics["funding"]["fundingOverTime"] }) {
  const max = Math.max(...data.map((d) => d.raisedCents), 1);
  const recent = data.slice(-10);
  return (
    <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
      <Text variant="title">Raised per day</Text>
      <View style={styles.bars}>
        {recent.map((d) => (
          <View key={d.day} style={styles.barCol} accessibilityLabel={`${d.day}: ${money(d.raisedCents)}`}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: `${Math.max(6, (d.raisedCents / max) * 100)}%` }]} />
            </View>
            <Text variant="caption" style={{ fontSize: 10 }}>
              {d.day.slice(8)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function FeedbackBars({ label, t }: { label: string; t: FeedbackTally }) {
  const rows = [
    { key: "yes", label: "Yes", color: colors.teal, n: t.yes },
    { key: "somewhat", label: "Somewhat", color: colors.amber, n: t.somewhat },
    { key: "no", label: "No", color: colors.coral, n: t.no },
  ];
  return (
    <View style={{ gap: 6, marginBottom: spacing.lg }}>
      <Text variant="title" style={{ fontSize: 14 }}>
        {label} <Text variant="caption">· {t.total} answers</Text>
      </Text>
      {t.total === 0 ? (
        <Text variant="caption">No answers yet.</Text>
      ) : (
        <View style={styles.stack}>
          {rows.map((r) => (r.n > 0 ? <View key={r.key} style={{ flex: r.n, backgroundColor: r.color }} /> : null))}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        {rows.map((r) => (
          <Text key={r.key} variant="caption">
            <Text variant="caption" color={r.color}>
              ●
            </Text>{" "}
            {r.label} {r.n}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PostUpdateSheet({ visible, onClose, campaignId }: { visible: boolean; onClose: () => void; campaignId: string }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const post = useMutation({
    mutationFn: () =>
      campaignsApi.postUpdate(campaignId, {
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      toast("Update posted. Followers were notified.");
      setTitle("");
      setBody("");
      void qc.invalidateQueries({ queryKey: keys.updates(campaignId) });
      onClose();
    },
  });
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          padding: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text variant="h2" style={{ flex: 1 }}>
            Post an update
          </Text>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
        <Text variant="bodySm">Share progress with backers and followers. Everyone following the campaign gets a notification.</Text>
        <TextField label="Title" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. We passed 50%!" />
        <TextField label="Update" value={body} onChangeText={setBody} multiline minLines={6} maxLength={5000} placeholder="What's new?" />
        {post.isError && <Note tone="danger">{post.error instanceof ApiError ? post.error.message : "Couldn't post the update."}</Note>}
        <Button
          label="Post update"
          icon="send"
          loading={post.isPending}
          disabled={!title.trim() || !body.trim()}
          onPress={() => post.mutate()}
        />
      </View>
    </Modal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      gap: spacing.lg,
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    cover: {
      width: 88,
      height: 88,
      borderRadius: radius.lg,
      backgroundColor: colors.primarySoft,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    action: {
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      minHeight: 84,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    section: { marginTop: spacing.xxl, gap: spacing.md },
    fundingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xl,
    },
    milestones: { flexDirection: "row", gap: spacing.sm },
    milestone: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    milestoneHit: { backgroundColor: colors.primary },
    tiles: { flexDirection: "row", gap: spacing.md },
    bars: { flexDirection: "row", alignItems: "flex-end", height: 110, gap: 6 },
    barCol: {
      flex: 1,
      height: "100%",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 4,
    },
    barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
    bar: {
      width: "100%",
      borderRadius: 4,
      backgroundColor: colors.primaryMuted,
    },
    update: {
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      gap: 4,
    },
    stack: {
      flexDirection: "row",
      height: 12,
      borderRadius: 6,
      overflow: "hidden",
      gap: 2,
    },
  }),
);
