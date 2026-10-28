// One campaign under review: everything the creator submitted, the AI pre-screen as a suggestion,
// past decisions, and the three actions (approve, ask for changes, reject) pinned at the bottom.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { useAdminCampaign, useAdminReview } from "@/api/queries";
import type { AdminCampaign, AiSuggestion, CampaignReview, ReviewInput } from "@/api/types";
import { Avatar, Button, ErrorState, LoadingState, StatusPill, Text, useToast } from "@/components/ui";
import { showAlert } from "@/components/ui/alert-dialog";
import { DecisionBadge, toneColors } from "@/features/admin/admin-parts";
import { DecisionSheet, STEP_NAMES } from "@/features/admin/decision-sheet";
import { AdPreview } from "@/features/campaigns/ad-preview";
import { Group, SectionLabel, ValueRow } from "@/features/campaigns/campaign-parts";
import { SourceList, StoryBlocks } from "@/features/campaigns/story";
import { date, dateTime, money, reachRange, timeAgo } from "@/lib/format";
import { CATEGORY, CREATOR_TYPE } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed } from "@/theme";

export default function AdminCampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useAdminCampaign(id);
  const review = useAdminReview(id);
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<"changes_requested" | "rejected" | null>(null);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const c = query.data;
  const pending = c.status === "submitted";

  const decide = (input: ReviewInput) =>
    review.mutate(input, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSheet(null);
        toast(
          input.decision === "approved" ? "Approved. The campaign is live." : input.decision === "rejected" ? "Campaign rejected" : "Sent back to the creator",
          input.decision === "approved" ? "success" : undefined,
        );
        router.back();
      },
      onError: (err) => {
        // Errors inside the sheet show there; an approve failure needs a toast
        if (!sheet) toast(err instanceof ApiError ? err.message : "Couldn't save the decision. Try again.", "error");
      },
    });

  const approve = () =>
    showAlert("Approve this campaign?", "It goes live for funding right away and the creator is notified.", [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => decide({ decision: "approved" }) },
    ]);

  const cat = c.category ? CATEGORY[c.category] : null;
  const ad = c.ad.assets.find((a) => a.type === "image");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: (pending ? 120 : spacing.huge) + insets.bottom }}>
        <View>
          {c.coverImageUrl ? (
            <Image source={{ uri: c.coverImageUrl }} style={styles.cover} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.cover, styles.noCover]}>
              <Ionicons name="image-outline" size={36} color={colors.textSubtle} />
            </View>
          )}
          <View style={styles.coverBadges}>
            <StatusPill status={c.status} />
            {c.isResubmission && pending && (
              <View style={styles.resub}>
                <Ionicons name="refresh" size={12} color={colors.blue} />
                <Text style={styles.resubText}>Resubmitted</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 6 }}>
            {cat && (
              <View style={styles.row}>
                <Ionicons name={cat.icon} size={14} color={cat.tint} />
                <Text variant="caption" color={cat.tint} style={{ fontFamily: fonts.semibold }}>
                  {cat.label}
                </Text>
                <Text variant="caption">· Submitted {c.submittedAt ? timeAgo(c.submittedAt) : ""}</Text>
              </View>
            )}
            <Text variant="h1">{c.title}</Text>
            {c.summary ? <Text variant="body" color={colors.textMuted}>{c.summary}</Text> : null}
          </Animated.View>

          <CreatorCard c={c} />

          {pending && <SuggestionCard suggestion={c.aiSuggestion} onUse={(d) => (d === "approved" ? approve() : setSheet(d))} canReject={c.canReject} />}

          <SectionLabel>About</SectionLabel>
          <Group>
            <Field label="Why it matters" value={c.whyItMatters} />
            <Field label="Target audience" value={c.targetAudience} />
            <Field label="About the creator" value={c.creatorDescription} />
          </Group>

          <SectionLabel>Story</SectionLabel>
          <View style={styles.story}>
            {c.story.headline ? <Text variant="h2">{c.story.headline}</Text> : null}
            {c.story.intro ? <Text variant="article">{c.story.intro}</Text> : null}
            <StoryBlocks blocks={c.story.blocks} sources={c.sources} />
          </View>

          <SectionLabel>{`Sources (${c.sources.length})`}</SectionLabel>
          {c.sources.length ? (
            <SourceList sources={c.sources} />
          ) : (
            <View style={styles.warnRow}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text variant="bodySm" color={colors.warning}>
                No sources added
              </Text>
            </View>
          )}

          <SectionLabel>Ad preview</SectionLabel>
          <AdPreview
            placement={c.reach.channels?.[0] ?? "facebook"}
            creatorName={c.creatorName}
            headline={c.ad.headline}
            description={c.ad.description}
            ctaText={c.ad.ctaText}
            imageUrl={ad?.url ?? c.coverImageUrl}
          />

          <SectionLabel>Funding & reach</SectionLabel>
          <Group>
            <ValueRow label="Funding goal" value={money(c.funding.goalCents)} strong />
            <ValueRow label="Raised so far" value={`${money(c.funding.raisedCents)} · ${c.funding.backerCount} backers`} />
            <ValueRow label="Duration" value={c.durationDays ? `${c.durationDays} days` : "—"} />
            <ValueRow label="Estimated reach at goal" value={reachRange(c.funding.estimatedReachAtGoal)} hint="Estimate, shown to backers as a range" />
            <ValueRow label="Locations" value={c.reach.locations?.join(", ") || "—"} />
            <ValueRow label="Ages" value={c.reach.ageMin || c.reach.ageMax ? `${c.reach.ageMin ?? 13}–${c.reach.ageMax ?? "65+"}` : "All"} />
            <ValueRow
              label="Channels"
              value={(c.reach.channels ?? []).map((ch) => `${ch === "facebook" ? "Facebook" : "Instagram"} ${c.reach.budgetSplit?.[ch] ?? 0}%`).join(" · ") || "—"}
            />
          </Group>

          {c.reviews.length > 0 && (
            <>
              <SectionLabel>Review history</SectionLabel>
              <View style={{ gap: spacing.sm }}>
                {c.reviews.map((r, i) => (
                  <HistoryRow key={i} r={r} />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {pending && (
        <Animated.View entering={FadeInDown.duration(300).delay(150)} exiting={FadeOutDown} style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label="Reject"
            variant="danger"
            icon="close"
            size="sm"
            disabled={!c.canReject || review.isPending}
            onPress={() => setSheet("rejected")}
            style={{ flex: 1 }}
          />
          <Button label="Changes" variant="secondary" icon="create-outline" size="sm" disabled={review.isPending} onPress={() => setSheet("changes_requested")} style={{ flex: 1.15 }} />
          <Button label="Approve" icon="checkmark" size="sm" loading={review.isPending && !sheet} onPress={approve} style={{ flex: 1.2 }} />
        </Animated.View>
      )}

      <DecisionSheet
        decision={sheet}
        suggestion={c.aiSuggestion}
        busy={review.isPending}
        error={sheet && review.error ? (review.error instanceof ApiError ? review.error.message : "Couldn't save. Try again.") : null}
        onClose={() => {
          setSheet(null);
          review.reset();
        }}
        onSubmit={decide}
      />
    </View>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <Text variant="body" color={value ? colors.text : colors.textSubtle}>
        {value || "Not provided"}
      </Text>
    </View>
  );
}

function CreatorCard({ c }: { c: AdminCampaign }) {
  return (
    <View style={styles.creator}>
      <Avatar name={c.creator.fullName} url={c.creator.avatarUrl} size={44} />
      <View style={{ flex: 1 }}>
        <Text variant="title">{c.creatorName || c.creator.fullName}</Text>
        <Text variant="caption" numberOfLines={1}>
          {c.creator.email}
        </Text>
        <Text variant="caption">
          {c.creatorType ? `${CREATOR_TYPE[c.creatorType]} · ` : ""}
          {c.creator.campaignCount} {c.creator.campaignCount === 1 ? "campaign" : "campaigns"} · joined {date(c.creator.createdAt)}
        </Text>
      </View>
    </View>
  );
}

/** The automated pre-screen: what it found, and a shortcut to act on it. */
function SuggestionCard({
  suggestion,
  onUse,
  canReject,
}: {
  suggestion: AiSuggestion | null;
  onUse: (d: AiSuggestion["decision"]) => void;
  canReject: boolean;
}) {
  if (!suggestion) {
    return (
      <View style={[styles.suggest, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Ionicons name="bulb-outline" size={18} color={colors.textMuted} />
          <Text variant="title" color={colors.textMuted}>
            AI pre-screen running…
          </Text>
        </View>
        <Text variant="caption">It takes a few seconds. You can review without it.</Text>
      </View>
    );
  }
  const t = toneColors(suggestion.decision === "approved" ? "success" : suggestion.decision === "rejected" ? "danger" : "warning");
  const label = suggestion.decision === "approved" ? "Approve" : suggestion.decision === "rejected" ? "Reject" : "Ask for changes";
  const usable = suggestion.decision !== "rejected" || canReject;
  return (
    <Animated.View entering={FadeIn.duration(350)} style={[styles.suggest, { backgroundColor: t.bg, borderColor: t.bg }]}>
      <View style={styles.row}>
        <Ionicons name="bulb" size={18} color={t.fg} />
        <Text variant="title" color={t.fg} style={{ flex: 1 }}>
          AI suggests: {label}
        </Text>
        <Text variant="caption">{suggestion.reviewer === "ai" ? "Language model" : "Built-in rules"}</Text>
      </View>
      <Text variant="bodySm" color={colors.text}>
        {suggestion.summary}
      </Text>
      {suggestion.issues.map((issue, i) => (
        <View key={i} style={styles.issue}>
          <View style={[styles.dot, { backgroundColor: t.fg }]} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" color={colors.text}>
              {issue.message}
            </Text>
            <Text variant="caption">Step {issue.step}: {STEP_NAMES[issue.step - 1]}</Text>
          </View>
        </View>
      ))}
      <View style={styles.row}>
        <Text variant="caption" style={{ flex: 1 }}>
          A suggestion only. You make the decision.
        </Text>
        {usable && <Button label={`Use: ${label}`} size="sm" variant="outline" onPress={() => onUse(suggestion.decision)} />}
      </View>
    </Animated.View>
  );
}

function HistoryRow({ r }: { r: CampaignReview }) {
  return (
    <View style={styles.history}>
      <View style={styles.row}>
        <DecisionBadge decision={r.decision} />
        <Text variant="caption" style={{ flex: 1, textAlign: "right" }}>
          {r.reviewer === "admin" ? "Admin" : "Automated"} · {dateTime(r.at)}
        </Text>
      </View>
      <Text variant="bodySm" color={colors.text}>
        {r.summary}
      </Text>
      {r.issues.map((issue, i) => (
        <Text key={i} variant="caption">
          • {issue.message} (Step {issue.step})
        </Text>
      ))}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    cover: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surface },
    noCover: { alignItems: "center", justifyContent: "center" },
    coverBadges: { position: "absolute", left: spacing.lg, bottom: spacing.md, flexDirection: "row", gap: 6 },
    resub: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.blueSoft },
    resubText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue },
    body: { padding: spacing.xl, gap: spacing.lg },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    creator: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
    suggest: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1 },
    issue: { flexDirection: "row", gap: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
    field: { padding: spacing.lg, gap: 2 },
    story: { gap: spacing.md },
    warnRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
    history: { padding: spacing.md, gap: 6, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  }),
);
