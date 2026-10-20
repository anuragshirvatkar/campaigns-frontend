import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, radius, spacing, themed } from "@/theme";
import { Text } from "./text";

export function ProgressBar({
  value,
  color = colors.primary,
  track = colors.primarySoft,
  height = 8,
  label,
}: {
  value: number; // 0–100, may exceed 100 when over-funded
  color?: string;
  track?: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { height, backgroundColor: track, borderRadius: height }]}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, borderRadius: height }]} />
    </View>
  );
}

/** Donut progress, like the reference "daily intake" ring. */
export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  color = colors.primary,
  track = colors.primarySoft,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** The five-step creation indicator: segmented bar + "STEP 2 OF 5 · STORY". */
export function StepProgress({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <View style={styles.steps} accessibilityLabel={`Step ${step} of ${total}, ${labels[step - 1]}`}>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < step ? colors.primary : colors.primarySoft },
              i === step - 1 && styles.segmentCurrent,
            ]}
          />
        ))}
      </View>
      <Text variant="overline">
        Step {step} of {total} · {labels[step - 1]}
      </Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  fill: { height: "100%" },
  center: { alignItems: "center", justifyContent: "center" },
  steps: { gap: spacing.sm, alignItems: "center" },
  segments: { flexDirection: "row", gap: 6, width: "100%" },
  segment: { flex: 1, height: 5, borderRadius: radius.pill },
  segmentCurrent: { height: 5 },
}));
