// Platform analytics for the admin: money raised, people, review, campaign stages, payments,
// ad delivery and engagement, for the last 7, 30 or 90 days (plus all-time totals).
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdminAnalytics } from "@/api/queries";
import type { AdminAnalytics, AnalyticsRange, CampaignStatus } from "@/api/types";
import { ErrorState, ProgressBar, ProgressRing, Skeleton, StatusBarShade, Text } from "@/components/ui";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { AdminHeader, SegmentTabs } from "@/features/admin/admin-parts";
import { AreaChart, BarChart, ChartCard, Donut, HBars, KpiTile, SERIES, StackedBar } from "@/features/admin/charts";
import { compactNumber, fullNumber, money } from "@/lib/format";
import { CATEGORY, type IconName } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed } from "@/theme";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [range, setRange] = useState<AnalyticsRange>("30");
  const query = useAdminAnalytics(range);
  const data = query.data;
  const [pulling, setPulling] = useState(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AdminHeader title="Analytics" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabSpace + spacing.xl }]}
        // Spinner only for a pull; background refreshes and range switches keep the numbers up quietly
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              void query.refetch().finally(() => setPulling(false));
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <SegmentTabs
          value={range}
          onChange={setRange}
          items={[
            { key: "7", label: "7 days" },
            { key: "30", label: "30 days" },
            { key: "90", label: "90 days" },
            { key: "all", label: "All time" },
          ]}
        />
        {!data ? (
          query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <LoadingSkeleton />
          )
        ) : (
          <Dashboard a={data} />
        )}
      </ScrollView>
      <StatusBarShade />
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ gap: spacing.lg }}>
      <Skeleton height={150} round={radius.xl} />
      <View style={styles.grid}>
        <Skeleton width="48%" height={110} round={radius.lg} />
        <Skeleton width="48%" height={110} round={radius.lg} />
      </View>
      <Skeleton height={240} round={radius.lg} />
    </View>
  );
}

const STAGES: { label: string; statuses: CampaignStatus[] }[] = [
  { label: "Live for funding", statuses: ["funding", "approved"] },
  { label: "Ads running", statuses: ["funded", "funding_ended", "distribution_prep", "promoting"] },
  { label: "Completed", statuses: ["completed"] },
  { label: "In review", statuses: ["submitted", "changes_requested"] },
  { label: "Stopped", statuses: ["rejected", "cancelled"] },
];

function Dashboard({ a }: { a: AdminAnalytics }) {
  const enter = (i: number) => FadeInDown.duration(380).delay(i * 60);
  const raised = a.daily.map((d) => ({ date: d.date, value: d.raisedCents }));
  const contributions = a.daily.map((d) => ({ date: d.date, value: d.contributions }));
  const signups = a.daily.map((d) => ({ date: d.date, value: d.signups }));
  const stageCount = (s: CampaignStatus[]) => a.statuses.filter((x) => s.includes(x.status)).reduce((sum, x) => sum + x.count, 0);
  const stages = STAGES.map((s, i) => ({ label: s.label, value: stageCount(s.statuses), color: SERIES[i]! }));
  const funnelTop = a.funnel[0]?.count ?? 0;
  const trend = a.kpis.prevRaisedCents ? Math.round(((a.kpis.raisedCents - a.kpis.prevRaisedCents) / a.kpis.prevRaisedCents) * 100) : null;
  const period = a.days ? `the last ${a.days} days` : "all time";
  const per = a.bucket === "week" ? "week" : "day";
  const week = a.bucket === "week";
  const decided = a.review.decisions.approved + a.review.decisions.changesRequested + a.review.decisions.rejected;

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Hero: money raised in the period */}
      <Animated.View entering={enter(0)} style={styles.hero}>
        <View style={styles.heroBubble} />
        <View style={[styles.heroBubble, styles.heroBubble2]} />
        <Text style={styles.heroOver}>
          {a.days ? `RAISED · LAST ${a.days} DAYS` : a.since ? `RAISED · ALL TIME (SINCE ${shortDay(a.since).toUpperCase()})` : "RAISED · ALL TIME"}
        </Text>
        <Text style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>
          {money(a.kpis.raisedCents)}
        </Text>
        <View style={styles.row}>
          {trend !== null && (
            <View style={styles.heroTrend}>
              <Ionicons name={trend >= 0 ? "trending-up" : "trending-down"} size={14} color="#FFFFFF" />
              <Text style={styles.heroTrendText}>
                {Math.abs(trend)}% vs previous {a.days} days
              </Text>
            </View>
          )}
        </View>
        <View style={styles.heroStats}>
          {a.days ? (
            <HeroStat label="All time" value={money(a.allTime.raisedCents, { compact: true })} />
          ) : (
            <HeroStat label="Fees earned" value={money(a.kpis.platformFeeCents, { compact: true })} />
          )}
          <HeroStat label="Users" value={compactNumber(a.allTime.users)} />
          <HeroStat label="Campaigns" value={String(a.allTime.campaigns)} />
          <HeroStat label="Live now" value={String(a.allTime.live)} />
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)} style={styles.grid}>
        <KpiTile
          icon="card"
          label="Contributions"
          value={fullNumber(a.kpis.contributions)}
          current={a.kpis.contributions}
          previous={a.kpis.prevContributions ?? undefined}
        />
        <KpiTile
          icon="person-add"
          label="New users"
          value={fullNumber(a.kpis.newUsers)}
          current={a.kpis.newUsers}
          previous={a.kpis.prevNewUsers ?? undefined}
          tint={colors.teal}
          wash={colors.tealSoft}
        />
      </Animated.View>
      <Animated.View entering={enter(2)} style={styles.grid}>
        <KpiTile icon="people" label="Backers" value={fullNumber(a.kpis.backers)} tint={colors.coral} wash={colors.coralSoft} />
        <KpiTile
          icon="cash"
          label="Avg contribution"
          value={money(a.kpis.avgContributionCents)}
          tint={colors.blue}
          wash={colors.blueSoft}
        />
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <ChartCard title="Money raised" caption={`Succeeded contributions per ${per} · drag to read a ${per}`}>
          <AreaChart points={raised} format={(v) => money(v, { compact: true })} unit="raised" week={week} />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <ChartCard title="Contributions" caption={`Payments per ${per} · tap a bar`}>
          <BarChart points={contributions} format={(v) => String(v)} color={SERIES[1]} unit="payments" week={week} />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(5)}>
        <ChartCard title="New sign-ups" caption={`Accounts created per ${per} · tap a bar`}>
          <BarChart points={signups} format={(v) => String(v)} color={SERIES[2]} unit="sign-ups" week={week} />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(6)}>
        <ChartCard
          title="Review"
          caption={`${decided} decisions, ${period}`}
          right={
            a.review.pending > 0 ? (
              <Pressable onPress={() => router.navigate("/review")} style={styles.pendingPill} accessibilityRole="button">
                <Text style={styles.pendingText}>{a.review.pending} pending ›</Text>
              </Pressable>
            ) : undefined
          }
        >
          <View style={styles.reviewRow}>
            <ProgressRing value={a.review.approvalRatePct ?? 0} size={104} stroke={11} color={colors.success} track={colors.successSoft}>
              <Text variant="number" style={{ fontSize: 20 }}>
                {a.review.approvalRatePct === null ? "—" : `${a.review.approvalRatePct}%`}
              </Text>
              <Text variant="caption">approved</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <MiniStat icon="time-outline" label="Avg time to decide" value={formatHours(a.review.avgReviewHours)} />
              <MiniStat
                icon="bulb-outline"
                label="Matched AI suggestion"
                value={a.review.aiAgreement?.agreedPct == null ? "—" : `${a.review.aiAgreement.agreedPct}%`}
              />
              <MiniStat icon="create-outline" label="Waiting on creators" value={String(a.review.changesRequested)} />
              <MiniStat icon="close-circle-outline" label="Rejected (all time)" value={String(a.review.rejected)} />
            </View>
          </View>
          <StackedBar
            segments={[
              { label: "Approved", value: a.review.decisions.approved, color: colors.success },
              { label: "Changes", value: a.review.decisions.changesRequested, color: colors.warning },
              { label: "Rejected", value: a.review.decisions.rejected, color: colors.danger },
            ]}
          />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(7)}>
        <ChartCard title="Campaigns by stage" caption="All campaigns except drafts · tap a slice">
          <Donut segments={stages} centerValue={String(stages.reduce((s, x) => s + x.value, 0))} centerLabel="campaigns" />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(8)}>
        <ChartCard title="Campaign funnel" caption="How far submitted campaigns get, all time">
          <HBars
            rows={a.funnel.map((f) => ({
              label: f.label,
              value: f.count,
              display: String(f.count),
              note: funnelTop && f.key !== "submitted" ? `${Math.round((f.count / funnelTop) * 100)}%` : undefined,
            }))}
          />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(9)}>
        <ChartCard title="Raised by category" caption="All time, campaigns that passed review">
          <HBars
            rows={a.categories.slice(0, 6).map((c) => ({
              label: CATEGORY[c.category]?.label ?? c.category,
              icon: CATEGORY[c.category]?.icon,
              value: c.raised,
              display: money(c.raised, { compact: true }),
              note: `${c.campaigns} ${c.campaigns === 1 ? "campaign" : "campaigns"}`,
            }))}
            color={SERIES[0]}
          />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(10)}>
        <ChartCard
          title="Payments"
          caption={`Checkout attempts, ${period}`}
          right={a.payments.successRatePct !== null ? <Text style={styles.bigPct}>{a.payments.successRatePct}%</Text> : undefined}
        >
          <StackedBar
            segments={[
              { label: "Succeeded", value: a.payments.succeeded, color: colors.success },
              { label: "Declined", value: a.payments.failed, color: colors.danger },
              { label: "Cancelled", value: a.payments.cancelled + a.payments.pending, color: colors.textSubtle },
            ]}
          />
          <Text variant="caption">Platform fees earned: {money(a.kpis.platformFeeCents)} (20% of each contribution)</Text>
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(11)}>
        <ChartCard title="Ad delivery" caption={`Ad spend ${money(a.delivery.spend)} across all campaigns`}>
          <View style={styles.deliveryGrid}>
            <DeliveryStat icon="eye-outline" label="Impressions" value={compactNumber(a.delivery.impressions)} />
            <DeliveryStat icon="people-outline" label="People reached" value={compactNumber(a.delivery.reach)} />
            <DeliveryStat icon="hand-left-outline" label="Clicks" value={compactNumber(a.delivery.clicks)} />
            <DeliveryStat icon="analytics-outline" label="Click rate" value={`${a.delivery.ctrPct}%`} />
          </View>
          <Text variant="caption" color={colors.text} style={{ fontFamily: fonts.medium }}>
            Impressions by channel
          </Text>
          <StackedBar
            format={compactNumber}
            segments={a.delivery.channels.map((ch, i) => ({
              label: ch.channel === "facebook" ? "Facebook" : "Instagram",
              value: ch.impressions,
              color: i === 0 ? SERIES[3]! : SERIES[2]!,
            }))}
          />
        </ChartCard>
      </Animated.View>

      <Animated.View entering={enter(12)}>
        <ChartCard title="Engagement" caption="Follows, comments and backer feedback, all time">
          <View style={styles.grid}>
            <MiniStat icon="notifications-outline" label="Follows" value={fullNumber(a.engagement.follows)} boxed />
            <MiniStat icon="chatbubbles-outline" label="Comments" value={fullNumber(a.engagement.comments)} boxed />
          </View>
          <Text variant="caption" color={colors.text} style={{ fontFamily: fonts.medium }}>
            “Did this campaign change your mind?”
          </Text>
          <StackedBar
            segments={[
              { label: "Yes", value: a.engagement.feedback.yes, color: SERIES[0]! },
              { label: "Somewhat", value: a.engagement.feedback.somewhat, color: SERIES[1]! },
              { label: "No", value: a.engagement.feedback.no, color: SERIES[2]! },
            ]}
          />
        </ChartCard>
      </Animated.View>

      {a.topCampaigns.length > 0 && (
        <Animated.View entering={enter(13)}>
          <ChartCard title="Top campaigns" caption="Most raised, all time">
            <View style={{ gap: spacing.md }}>
              {a.topCampaigns.map((c, i) => {
                const pct = c.goalCents ? Math.round((c.raisedCents / c.goalCents) * 100) : 0;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: "/admin/campaign/[id]", params: { id: c.id } })}
                    style={({ pressed }) => [styles.top, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.rank}>{i + 1}</Text>
                    {c.imageUrl ? (
                      <Image source={{ uri: c.imageUrl }} style={styles.topImg} contentFit="cover" />
                    ) : (
                      <View style={styles.topImg} />
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="title" numberOfLines={1} style={{ fontSize: 14 }}>
                        {c.title}
                      </Text>
                      <ProgressBar value={pct} height={5} />
                      <Text variant="caption">
                        {money(c.raisedCents)} · {pct}% · {c.backers} backers
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ChartCard>
        </Animated.View>
      )}
    </View>
  );
}

const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function formatHours(h: number | null) {
  if (h === null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.heroStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MiniStat({ icon, label, value, boxed }: { icon: IconName; label: string; value: string; boxed?: boolean }) {
  return (
    <View style={[styles.mini, boxed && styles.miniBoxed]}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text variant="caption" color={colors.text} style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" style={{ fontFamily: fonts.semibold }}>
        {value}
      </Text>
    </View>
  );
}

function DeliveryStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.delivery}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text variant="number" style={{ fontSize: 19 }}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, gap: spacing.lg },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    grid: { flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
    hero: { padding: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.primary, overflow: "hidden", gap: 4 },
    heroBubble: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: "rgba(255,255,255,0.08)",
      top: -60,
      right: -40,
    },
    heroBubble2: { width: 110, height: 110, top: 60, right: 70, backgroundColor: "rgba(255,255,255,0.06)" },
    heroOver: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, color: "rgba(255,255,255,0.8)" },
    heroValue: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 46, color: "#FFFFFF" },
    heroTrend: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    heroTrendText: { fontFamily: fonts.medium, fontSize: 12, color: "#FFFFFF" },
    heroStats: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: "rgba(255,255,255,0.2)",
    },
    heroStatValue: { fontFamily: fonts.semibold, fontSize: 17, color: "#FFFFFF" },
    heroStatLabel: { fontFamily: fonts.regular, fontSize: 11, color: "rgba(255,255,255,0.75)" },
    reviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
    mini: { flexDirection: "row", alignItems: "center", gap: 8 },
    miniBoxed: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
    pendingPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.warningSoft },
    pendingText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.warning },
    bigPct: { fontFamily: fonts.bold, fontSize: 22, color: colors.success },
    deliveryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    delivery: { width: "48.5%", flexGrow: 1, padding: spacing.md, gap: 2, borderRadius: radius.md, backgroundColor: colors.surface },
    top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    rank: { width: 18, fontFamily: fonts.bold, fontSize: 15, color: colors.textSubtle, textAlign: "center" },
    topImg: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface },
  }),
);
