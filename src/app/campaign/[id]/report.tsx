// Distribution report: one headline result (people reached, with its growth curve), then where the money
// went, how the ads performed, and where they ran. Estimates and measured numbers stay clearly apart.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useReport } from "@/api/queries";
import type { Report } from "@/api/types";
import { Card, EmptyState, ErrorState, LoadingState, Screen, StatusPill, Text } from "@/components/ui";
import { AccordionRow, campaignStyles, Group, SectionLabel } from "@/features/campaigns/campaign-parts";
import { METRIC_DEFINITIONS } from "@/features/campaigns/report-parts";
import { compactNumber, date, fullNumber, money, reachRange } from "@/lib/format";
import { CHANNEL, STATUS, type IconName } from "@/lib/labels";
import { goBackOr } from "@/lib/nav";
import { colors, fonts, radius, shadow, spacing, themed } from "@/theme";

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useReport(id);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const r = query.data;
  const f = r.funds;

  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      {/* Title */}
      <View style={{ gap: spacing.sm }}>
        <StatusPill status={r.campaign.status} />
        <Text variant="h2">{r.campaign.title}</Text>
        <Text variant="caption">
          {r.isFinal ? "Final report" : "Live report"}
          {r.promotingAt ? ` · ${date(r.promotingAt)}` : ""}
          {r.completedAt ? ` – ${date(r.completedAt)}` : ""}
        </Text>
      </View>

      {!r.hasDelivery ? (
        <>
          <View style={campaignStyles.section}>
            <SectionLabel>Where the money went</SectionLabel>
            <MoneyCard r={r} />
          </View>
          <EmptyState
            compact
            icon="hourglass-outline"
            title="Delivery hasn't started"
            body={`${STATUS[r.campaign.status].explain} Measured numbers appear here once ads are running.`}
            actionLabel="Back to campaign"
            onAction={() => goBackOr({ pathname: "/campaign/[id]", params: { id } })}
          />
        </>
      ) : (
        <>
          <ReachHero r={r} />

          <View style={campaignStyles.section}>
            <SectionLabel>Where the money went</SectionLabel>
            <MoneyCard r={r} />
          </View>

          <View style={campaignStyles.section}>
            <SectionLabel>How the ads performed</SectionLabel>
            <View style={styles.statsRow}>
              <Stat icon="eye-outline" value={compactNumber(r.measured.impressions)} label="Impressions" />
              <Stat icon="hand-left-outline" value={compactNumber(r.measured.clicks)} label="Clicks" />
              <Stat icon="analytics-outline" value={`${r.measured.clickThroughRatePct}%`} label="Click rate" />
            </View>
          </View>

          {r.byChannel.length > 0 && (
            <View style={campaignStyles.section}>
              <SectionLabel>Where it ran</SectionLabel>
              <Group>
                {r.byChannel.map((ch) => {
                  const meta = CHANNEL[ch.channel] ?? { label: ch.channel, icon: "globe-outline" as IconName, color: colors.primary };
                  const share = f.adSpentCents > 0 ? Math.round((ch.adSpendCents / f.adSpentCents) * 100) : 0;
                  return (
                    <View key={ch.channel} style={styles.channel}>
                      <View style={[styles.channelIcon, { backgroundColor: `${meta.color}1A` }]}>
                        <Ionicons name={meta.icon} size={20} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={styles.channelHead}>
                          <Text variant="title">{meta.label}</Text>
                          <Text variant="title">{compactNumber(ch.reach)} people</Text>
                        </View>
                        <View style={styles.track}>
                          <View style={[styles.trackFill, { width: `${share}%`, backgroundColor: meta.color }]} />
                        </View>
                        <Text variant="caption">
                          {money(ch.adSpendCents)} spent · {share}% of budget · {compactNumber(ch.clicks)} clicks
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Group>
            </View>
          )}
        </>
      )}

      <View style={campaignStyles.section}>
        <Group>
          <AccordionRow icon="book-outline" title="What these numbers mean">
            {METRIC_DEFINITIONS.map((m) => (
              <View key={m.term} style={{ gap: 2, marginBottom: spacing.md }}>
                <Text variant="title">{m.term}</Text>
                <Text variant="bodySm">{m.def}</Text>
              </View>
            ))}
          </AccordionRow>
        </Group>
        {r.isSimulated && (
          <Text variant="caption" color={colors.textSubtle} style={{ marginTop: spacing.md }}>
            Delivery is simulated in this prototype. No real ads were bought; the numbers are generated for demonstration.
          </Text>
        )}
      </View>
    </Screen>
  );
}

/** Violet headline card: measured reach, the pre-launch estimate beside it, and the growth curve along the bottom. */
function ReachHero({ r }: { r: Report }) {
  const est = r.estimate.reachForRaised;
  const beat = r.measured.reach >= est.low;
  return (
    <View style={styles.hero}>
      <View style={{ padding: spacing.xl, gap: 4 }}>
        <Text variant="overline" color="rgba(255,255,255,0.75)">
          People reached
        </Text>
        <Text style={styles.heroValue}>{fullNumber(r.measured.reach)}</Text>
        <View style={styles.heroEstimate}>
          <Ionicons name={beat ? "checkmark-circle" : "information-circle"} size={16} color="#FFFFFF" />
          <Text variant="caption" color="#FFFFFF">
            {beat ? "Within or above" : "Below"} the estimate of {reachRange(est)}
          </Text>
        </View>
      </View>
      <Curve series={r.series} />
    </View>
  );
}

/** Soft white area curve of cumulative reach, drawn to the card's edges. */
function Curve({ series }: { series: Report["series"] }) {
  if (series.length < 2) return <View style={{ height: spacing.lg }} />;
  const W = 320;
  const H = 90;
  const max = Math.max(...series.map((p) => p.reach), 1);
  const pts = series.map((p, i) => ({ x: (i / (series.length - 1)) * W, y: H - 6 - (p.reach / max) * (H - 16) }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" accessibilityLabel="Reach over time">
      <Defs>
        <LinearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#heroFill)" />
      <Path d={line} stroke="#FFFFFF" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

/** Raised → ads + fee as one split bar, then how much of the ad budget is spent. */
function MoneyCard({ r }: { r: Report }) {
  const f = r.funds;
  const adPct = f.raisedCents > 0 ? (f.adBudgetCents / f.raisedCents) * 100 : 80;
  const spentPct = f.adBudgetCents > 0 ? Math.round((f.adSpentCents / f.adBudgetCents) * 100) : 0;
  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={styles.moneyHead}>
        <View>
          <Text variant="caption">Raised from {f.backerCount} backers</Text>
          <Text variant="number">{money(f.raisedCents)}</Text>
        </View>
      </View>
      <View style={styles.split}>
        <View style={[styles.splitAd, { flex: adPct }]} />
        <View style={[styles.splitFee, { flex: 100 - adPct }]} />
      </View>
      <View style={styles.legend}>
        <Legend color={colors.primary} label="Ad budget" value={money(f.adBudgetCents)} />
        <Legend color={colors.primarySoft} label="Platform fee" value={money(f.platformFeeCents)} />
      </View>
      <View style={styles.hairline} />
      <View style={styles.spentRow}>
        <Text variant="bodySm">Ad budget spent</Text>
        <Text variant="title" color={colors.primary}>
          {money(f.adSpentCents)} · {spentPct}%
        </Text>
      </View>
    </Card>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View>
        <Text variant="caption">{label}</Text>
        <Text variant="title">{value}</Text>
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text variant="h3">{value}</Text>
      <Text variant="caption">{label}</Text>
    </Card>
  );
}

const styles = themed(() => StyleSheet.create({
  hero: { marginTop: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.primary, overflow: "hidden", ...shadow.raised },
  heroValue: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: "#FFFFFF", includeFontPadding: false },
  heroEstimate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  moneyHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  split: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 3 },
  splitAd: { backgroundColor: colors.primary, borderRadius: 6 },
  splitFee: { backgroundColor: colors.primarySoft, borderRadius: 6 },
  legend: { flexDirection: "row", gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  spentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 4, paddingVertical: spacing.lg },
  channel: { flexDirection: "row", gap: spacing.md, padding: spacing.lg, alignItems: "flex-start" },
  channelIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  channelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 3 },
}));
