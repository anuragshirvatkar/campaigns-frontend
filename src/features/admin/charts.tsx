// Small chart kit for the admin analytics, drawn with react-native-svg and plain views.
// One axis per chart, thin marks with rounded ends, recessive grid, values in text colours,
// and a touch tooltip on every chart (drag across lines, tap bars and segments).
// Series colours: the app's accents, stepped so every pair passes the colour-vision checks
// in both themes (validated with the dataviz palette validator).
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { Text } from "@/components/ui";
import type { IconName } from "@/lib/labels";
import { colors, dk, fonts, radius, spacing, themed } from "@/theme";

/** Categorical order: violet, teal, coral, blue, amber. Assigned in this order, never cycled. */
export const SERIES = themed(() =>
  dk(["#6C5DE8", "#1C9EB0", "#E8695C", "#3F8CF2", "#C98A12"], ["#8676FA", "#24A3B4", "#E0665A", "#4F93EE", "#B8831C"]),
);

const ease = Easing.out(Easing.cubic);

// ─── Area / line over time ────────────────────────────────────────────────────

/** Rounds the axis maximum up to a friendly number so gridlines land on readable values. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
/** Tooltip label for one point: the day, or the week it starts */
const pointLabel = (iso: string, week?: boolean) => (week ? `Week of ${shortDate(iso)}` : shortDate(iso));

/** One series over time with a soft fill. Drag across it to read any day. */
export function AreaChart({
  points,
  format,
  color = SERIES[0],
  height = 180,
  unit,
  week,
}: {
  points: { date: string; value: number }[];
  format: (v: number) => string;
  color?: string;
  height?: number;
  /** Tooltip suffix, e.g. "raised" */
  unit?: string;
  /** Points are weeks (long periods) */
  week?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.set(0);
    reveal.set(withTiming(1, { duration: 900, easing: ease }));
  }, [points, reveal]);
  const clip = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));

  const AXIS_W = 44;
  const plotW = Math.max(0, width - AXIS_W);
  const top = 10;
  const plotH = height - top - 24;
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const x = (i: number) => AXIS_W + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => top + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points.length - 1)} ${top + plotH} L${x(0)} ${top + plotH} Z` : "";
  const grid = [0, 0.5, 1].map((f) => ({ v: max * f, y: y(max * f) }));

  const pick = (e: GestureResponderEvent) => {
    if (!plotW || !points.length) return;
    const rel = (e.nativeEvent.locationX - AXIS_W) / plotW;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };
  const a = active !== null ? points[active] : null;
  const tipLeft = active !== null ? Math.max(0, Math.min(width - 132, x(active) - 66)) : 0;
  const labelIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={() => setActive(null)}
      onResponderTerminate={() => setActive(null)}
      onResponderTerminationRequest={() => false}
      accessibilityLabel={`Chart. Highest ${format(Math.max(...points.map((p) => p.value), 0))}`}
    >
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {grid.map((g, i) => (
              <Line key={i} x1={AXIS_W} x2={width} y1={g.y} y2={g.y} stroke={colors.divider} strokeWidth={1} strokeDasharray={i ? "3 4" : undefined} />
            ))}
          </Svg>
          {grid.map((g, i) => (
            <Text key={i} style={[styles.axis, { position: "absolute", left: 0, top: g.y - 15, width: AXIS_W - 6, textAlign: "right" }]}>
              {format(g.v)}
            </Text>
          ))}
          <Animated.View style={[StyleSheet.absoluteFill, { overflow: "hidden" }, clip]}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={area} fill="url(#fill)" />
              <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </Svg>
          </Animated.View>
          {labelIdx.map((i) => (
            <Text
              key={i}
              style={[
                styles.axis,
                { position: "absolute", bottom: 0, width: 60, left: Math.max(AXIS_W - 10, Math.min(width - 60, x(i) - 30)), textAlign: i === 0 ? "left" : i === points.length - 1 ? "right" : "center" },
              ]}
            >
              {shortDate(points[i]!.date)}
            </Text>
          ))}
          {a && active !== null && (
            <>
              <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} stroke={colors.textSubtle} strokeWidth={1} />
                <Circle cx={x(active)} cy={y(a.value)} r={6} fill={color} stroke={colors.card} strokeWidth={2} />
              </Svg>
              <View pointerEvents="none" style={[styles.tip, { left: tipLeft, top: -6 }]}>
                <Text style={styles.tipValue}>
                  {format(a.value)}
                  {unit ? <Text style={styles.tipUnit}> {unit}</Text> : null}
                </Text>
                <Text style={styles.tipLabel}>{pointLabel(a.date, week)}</Text>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

// ─── Vertical bars ────────────────────────────────────────────────────────────

/** Bars per day; tap one to see its value. Long ranges thin the bars, never the data. */
export function BarChart({
  points,
  format,
  color = SERIES[1],
  height = 150,
  unit,
  week,
}: {
  points: { date: string; value: number }[];
  format: (v: number) => string;
  color?: string;
  height?: number;
  unit?: string;
  week?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const plotH = height - 22;
  const gap = points.length > 40 ? 1 : 2;
  const a = active !== null ? points[active] : null;
  const barW = width ? (width - gap * (points.length - 1)) / Math.max(1, points.length) : 0;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.bars, { height: plotH, gap }]}>
        <View style={[styles.baseline, { top: plotH - 1 }]} />
        {points.map((p, i) => (
          <Pressable
            key={p.date}
            onPress={() => setActive(active === i ? null : i)}
            hitSlop={{ top: 12, bottom: 12 }}
            style={styles.barHit}
            accessibilityLabel={`${shortDate(p.date)}: ${format(p.value)}`}
          >
            <GrowBar pct={p.value / max} height={plotH} color={active === null || active === i ? color : colors.primaryMuted} delay={i * 12} />
          </Pressable>
        ))}
      </View>
      <View style={styles.barLabels}>
        <Text style={styles.axis}>{points[0] ? shortDate(points[0].date) : ""}</Text>
        <Text style={styles.axis}>{points.length ? shortDate(points[points.length - 1]!.date) : ""}</Text>
      </View>
      {a && active !== null && width > 0 && (
        <Animated.View entering={FadeIn.duration(120)} pointerEvents="none" style={[styles.tip, { top: -8, left: Math.max(0, Math.min(width - 132, active * (barW + gap) + barW / 2 - 66)) }]}>
          <Text style={styles.tipValue}>
            {format(a.value)}
            {unit ? <Text style={styles.tipUnit}> {unit}</Text> : null}
          </Text>
          <Text style={styles.tipLabel}>{pointLabel(a.date, week)}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function GrowBar({ pct, height, color, delay }: { pct: number; height: number; color: string; delay: number }) {
  const h = useSharedValue(0);
  const target = Math.max(pct > 0 ? 3 : 0, pct * height);
  useEffect(() => {
    h.set(withDelay(delay, withTiming(target, { duration: 600, easing: ease })));
  }, [target, delay, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

// ─── Donut ────────────────────────────────────────────────────────────────────

export type Segment = { label: string; value: number; color: string };

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const p = (t: number) => [cx + r * Math.cos(t - Math.PI / 2), cy + r * Math.sin(t - Math.PI / 2)];
  const [x1, y1] = p(from);
  const [x2, y2] = p(to);
  return `M${x1} ${y1} A${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
}

/** Share of a whole. Tap a slice (or its legend row) to read it in the middle. */
export function Donut({ segments, size = 148, centerLabel, centerValue }: { segments: Segment[]; size?: number; centerLabel: string; centerValue: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const stroke = 18;
  const r = (size - stroke) / 2;
  const gapAngle = segments.filter((s) => s.value > 0).length > 1 ? 0.045 : 0;
  const sweeps = segments.map((s) => (total ? (s.value / total) * Math.PI * 2 : 0));
  const arcs = sweeps.map((sweep, i) => {
    const start = sweeps.slice(0, i).reduce((sum, x) => sum + x, 0);
    return { from: start + gapAngle / 2, to: start + sweep - gapAngle / 2 };
  });
  const shown = active !== null ? segments[active] : null;

  return (
    <View style={styles.donutRow}>
      <Animated.View entering={FadeIn.duration(500)} style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface} strokeWidth={stroke} fill="none" />
          {segments.map((s, i) =>
            s.value > 0 && arcs[i]!.to > arcs[i]!.from ? (
              <Path
                key={s.label}
                d={arc(size / 2, size / 2, r, arcs[i]!.from, arcs[i]!.to)}
                stroke={s.color}
                strokeWidth={active === i ? stroke + 4 : stroke}
                strokeLinecap="round"
                fill="none"
                opacity={active === null || active === i ? 1 : 0.35}
                onPress={() => setActive(active === i ? null : i)}
              />
            ) : null,
          )}
        </Svg>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
          <Text variant="number" style={{ fontSize: 22 }}>
            {shown ? shown.value : centerValue}
          </Text>
          <Text variant="caption" align="center" numberOfLines={2} style={{ maxWidth: size - stroke * 2 - 8 }}>
            {shown ? shown.label : centerLabel}
          </Text>
        </View>
      </Animated.View>
      <View style={{ flex: 1, gap: 6 }}>
        {segments.map((s, i) => (
          <Pressable key={s.label} onPress={() => setActive(active === i ? null : i)} style={[styles.legendRow, active === i && { backgroundColor: colors.surface }]}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text variant="caption" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
              {s.label}
            </Text>
            <Text variant="caption" color={colors.text} style={{ fontFamily: fonts.semibold }}>
              {total ? Math.round((s.value / total) * 100) : 0}%
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Horizontal bars ──────────────────────────────────────────────────────────

export type HRow = { label: string; value: number; display: string; color?: string; icon?: IconName; note?: string };

/** Ranked rows with bars that grow in; bars share one scale (the largest row). */
export function HBars({ rows, color = SERIES[0], max }: { rows: HRow[]; color?: string; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((r, i) => (
        <View key={r.label} style={{ gap: 6 }}>
          <View style={styles.hHead}>
            {r.icon && <Ionicons name={r.icon} size={14} color={r.color ?? color} />}
            <Text variant="bodySm" color={colors.text} numberOfLines={1} style={{ flex: 1 }}>
              {r.label}
            </Text>
            {r.note ? <Text variant="caption">{r.note}</Text> : null}
            <Text variant="bodySm" color={colors.text} style={{ fontFamily: fonts.semibold }}>
              {r.display}
            </Text>
          </View>
          <View style={styles.hTrack}>
            <GrowWidth pct={top ? r.value / top : 0} color={r.color ?? color} delay={i * 70} />
          </View>
        </View>
      ))}
    </View>
  );
}

function GrowWidth({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withDelay(delay, withTiming(Math.min(1, Math.max(0, pct)), { duration: 700, easing: ease })));
  }, [pct, delay, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return <Animated.View style={[styles.hFill, { backgroundColor: color }, style]} />;
}

/** One bar split into parts (with 2px gaps), and a legend underneath. */
export function StackedBar({ segments, format = String }: { segments: Segment[]; format?: (v: number) => string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.stack}>
        {total === 0 ? (
          <View style={[styles.stackPart, { flex: 1, backgroundColor: colors.surface }]} />
        ) : (
          visible.map(({ label, value: share, color }, i) => (
            <Animated.View
              key={label}
              entering={FadeIn.delay(i * 90).duration(400)}
              style={[styles.stackPart, { flex: share, backgroundColor: color, marginLeft: i ? 2 : 0 }]}
            />
          ))
        )}
      </View>
      <View style={styles.legendWrap}>
        {segments.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text variant="caption" color={colors.text}>
              {s.label} <Text variant="caption" style={{ fontFamily: fonts.semibold, color: colors.text }}>{format(s.value)}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Tiles ────────────────────────────────────────────────────────────────────

/** A headline number with its change against the previous period. */
export function KpiTile({
  icon,
  label,
  value,
  current,
  previous,
  tint = colors.primary,
  wash = colors.primarySoft,
}: {
  icon: IconName;
  label: string;
  value: string;
  current?: number;
  previous?: number;
  tint?: string;
  wash?: string;
}) {
  const trend = current !== undefined && previous !== undefined ? (previous === 0 ? (current > 0 ? null : 0) : Math.round(((current - previous) / previous) * 100)) : undefined;
  const up = (trend ?? 0) >= 0;
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: wash }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text variant="number" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: spacing.sm }}>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
      {trend !== undefined && (
        <View style={[styles.trend, { backgroundColor: trend === null ? colors.primarySoft : up ? colors.successSoft : colors.dangerSoft }]}>
          {trend === null ? (
            <Text style={[styles.trendText, { color: colors.primary }]}>New</Text>
          ) : (
            <>
              <Ionicons name={up ? "trending-up" : "trending-down"} size={12} color={up ? colors.success : colors.danger} />
              <Text style={[styles.trendText, { color: up ? colors.success : colors.danger }]}>{Math.abs(trend)}%</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

/** White card with a title row, for one chart. */
export function ChartCard({ title, caption, right, children }: { title: string; caption?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{title}</Text>
          {caption ? <Text variant="caption">{caption}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    axis: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.textMuted },
    tip: {
      position: "absolute",
      width: 132,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.md,
      backgroundColor: dk("#26264A", "#ECECF8"),
    },
    tipValue: { fontFamily: fonts.semibold, fontSize: 14, color: dk("#FFFFFF", "#0F1020") },
    tipUnit: { fontFamily: fonts.regular, fontSize: 11, color: dk("#C9C9E0", "#45466A") },
    tipLabel: { fontFamily: fonts.regular, fontSize: 11, color: dk("#C9C9E0", "#45466A") },
    bars: { flexDirection: "row", alignItems: "flex-end" },
    baseline: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: colors.border },
    barHit: { flex: 1, height: "100%", justifyContent: "flex-end" },
    bar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
    center: { alignItems: "center", justifyContent: "center" },
    donutRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
    legendRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.sm },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    hHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    hTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: "hidden" },
    hFill: { height: "100%", borderRadius: 4 },
    stack: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden" },
    stackPart: { height: "100%" },
    legendWrap: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.lg, rowGap: 6 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    kpi: {
      flex: 1,
      minWidth: 0,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kpiIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    trend: { position: "absolute", top: spacing.lg, right: spacing.md, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill },
    trendText: { fontFamily: fonts.semibold, fontSize: 11 },
    card: {
      padding: spacing.lg,
      gap: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  }),
);
