// Building blocks for reports and creator analytics. Estimates and measured numbers are
// always shown in separate, labelled places.
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { Report } from "@/api/types";
import { Card, ProgressBar, Text } from "@/components/ui";
import { compactNumber, fullNumber, money, reachRange } from "@/lib/format";
import { CHANNEL, type IconName } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";

/** Coloured metric tile, like the reference dashboard. */
export function MetricTile({
  label,
  value,
  sub,
  icon,
  bg,
  fg = colors.textOnDark,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: IconName;
  bg: string;
  fg?: string;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]} accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ""}`}>
      <View style={styles.tileTop}>
        <Text variant="overline" color={fg} style={{ opacity: 0.85 }}>
          {label}
        </Text>
        <Ionicons name={icon} size={18} color={fg} style={{ opacity: 0.85 }} />
      </View>
      <Text variant="h1" color={fg}>
        {value}
      </Text>
      {sub && (
        <Text variant="caption" color={fg} style={{ opacity: 0.8 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

export function MeasuredTiles({ r }: { r: Report }) {
  const stats: { label: string; value: string; sub: string; icon: IconName }[] = [
    { label: "Impressions", value: compactNumber(r.measured.impressions), sub: "times the ad was shown", icon: "eye-outline" },
    { label: "Clicks", value: compactNumber(r.measured.clicks), sub: "taps through to the campaign", icon: "hand-left-outline" },
    { label: "Click rate", value: `${r.measured.clickThroughRatePct}%`, sub: "clicks ÷ impressions", icon: "analytics-outline" },
  ];
  return (
    <Card style={styles.columns}>
      {stats.map((m) => (
        <View key={m.label} style={styles.stat} accessibilityLabel={`${m.label}: ${m.value}, ${m.sub}`}>
          <View style={styles.statHead}>
            <Ionicons name={m.icon} size={15} color={colors.primary} />
            <Text variant="caption">{m.label}</Text>
          </View>
          <Text variant="h2">{m.value}</Text>
          <Text variant="caption" color={colors.textSubtle}>
            {m.sub}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function FundsBreakdown({ r }: { r: Report }) {
  const f = r.funds;
  const spentPct = f.adBudgetCents > 0 ? (f.adSpentCents / f.adBudgetCents) * 100 : 0;
  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={styles.columns}>
        <FundCell label="Raised" value={money(f.raisedCents)} sub={`${f.backerCount} backers`} />
        <View style={styles.columnDivider} />
        <FundCell label="Platform fee" value={money(f.platformFeeCents)} sub="review & delivery" />
        <View style={styles.columnDivider} />
        <FundCell label="Ad budget" value={money(f.adBudgetCents)} sub="for advertising" accent />
      </View>
      <View style={styles.hairline} />
      <View style={{ gap: 6 }}>
        <View style={styles.spendRow}>
          <Text variant="title">Ad spend so far</Text>
          <Text variant="title" color={colors.primary}>
            {money(f.adSpentCents)} <Text variant="caption">of {money(f.adBudgetCents)}</Text>
          </Text>
        </View>
        <ProgressBar value={spentPct} height={8} label="Ad budget spent" />
      </View>
    </Card>
  );
}

function FundCell({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <View style={styles.column}>
      <Text variant="caption">{label}</Text>
      <Text variant="h3" color={accent ? colors.primary : colors.text}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textSubtle}>
        {sub}
      </Text>
    </View>
  );
}

export function EstimateVsMeasured({ r }: { r: Report }) {
  return (
    <Card style={styles.columns}>
      <View style={styles.compareCol}>
        <Text variant="overline" color={colors.textMuted}>
          Estimate
        </Text>
        <Text variant="h2">{reachRange(r.estimate.reachForRaised)}</Text>
        <Text variant="caption">people, predicted before launch for the amount raised</Text>
      </View>
      <View style={[styles.columnDivider, { marginHorizontal: spacing.md }]} />
      <View style={styles.compareCol}>
        <Text variant="overline" color={colors.success}>
          Measured
        </Text>
        <Text variant="h2" color={colors.success}>
          {fullNumber(r.measured.reach)}
        </Text>
        <Text variant="caption">people reached, reported by the ad platform (simulated)</Text>
      </View>
    </Card>
  );
}

export function ChannelBars({ r }: { r: Report }) {
  const max = Math.max(1, ...r.byChannel.map((c) => c.impressions));
  return (
    <Card style={{ gap: spacing.xl }}>
      {r.byChannel.map((c) => {
        const meta = CHANNEL[c.channel] ?? { label: c.channel, icon: "globe-outline" as IconName, color: colors.primary };
        return (
          <View key={c.channel} style={{ gap: 6 }}>
            <View style={styles.channelHead}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
              <Text variant="title" style={{ flex: 1 }}>
                {meta.label}
              </Text>
              <Text variant="caption">{money(c.adSpendCents)} spent</Text>
            </View>
            <ProgressBar value={(c.impressions / max) * 100} color={meta.color} height={8} />
            <Text variant="caption">
              {fullNumber(c.impressions)} impressions · {fullNumber(c.reach)} reached · {fullNumber(c.clicks)} clicks
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

/** Cumulative reach over the promotion, as a soft area chart. */
export function DeliveryChart({ series, height = 150 }: { series: Report["series"]; height?: number }) {
  if (series.length < 2) {
    return <Text variant="bodySm">The chart appears after the second delivery update.</Text>;
  }
  const W = 320;
  const H = height;
  const pad = 8;
  const max = Math.max(...series.map((p) => p.reach), 1);
  const pts = series.map((p, i) => ({
    x: pad + (i / (series.length - 1)) * (W - pad * 2),
    y: H - pad - (p.reach / max) * (H - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)!.x} ${H} L${pts[0]!.x} ${H} Z`;
  const last = pts.at(-1)!;
  return (
    <View accessibilityLabel={`Reach grew to ${fullNumber(series.at(-1)!.reach)} people over ${series.length} updates`}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#fill)" />
        <Path d={line} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last.x} cy={last.y} r={5} fill={colors.background} stroke={colors.primary} strokeWidth={3} />
      </Svg>
      <View style={styles.chartAxis}>
        <Text variant="caption">Start</Text>
        <Text variant="caption">{compactNumber(series.at(-1)!.reach)} reached</Text>
      </View>
    </View>
  );
}

export const METRIC_DEFINITIONS = [
  { term: "Funds raised", def: "Total of successful contributions. Processing fees paid by backers are not included." },
  { term: "Ad budget", def: "The part of funds raised that is spent on advertising (after the platform fee)." },
  { term: "Ad spend", def: "How much of the ad budget the ad platforms have actually spent so far." },
  { term: "Impressions", def: "How many times the ad was displayed. One person can see it several times." },
  {
    term: "Reach (measured)",
    def: "Unique people who saw the ad, as reported per channel. Someone who saw it on both channels may be counted twice.",
  },
  {
    term: "Reach (estimate)",
    def: "A prediction made before launch from demo assumptions. Shown only for comparison, never mixed with measured numbers.",
  },
  { term: "Clicks & click rate", def: "Taps on the ad, and clicks divided by impressions." },
];

const styles = themed(() => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { width: "47%", flexGrow: 1, borderRadius: radius.lg, padding: spacing.lg, gap: 4, minHeight: 128 },
  tileTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  stat: { flex: 1, gap: 2 },
  statHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  columns: { flexDirection: "row", alignItems: "center" },
  column: { flex: 1, alignItems: "center", gap: 2 },
  columnDivider: { width: StyleSheet.hairlineWidth * 2, alignSelf: "stretch", backgroundColor: colors.border },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  spendRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  compareCol: { flex: 1, gap: 4, paddingHorizontal: spacing.xs },
  channelHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
}));
