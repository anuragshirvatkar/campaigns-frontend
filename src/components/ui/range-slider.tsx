// Two-handle range slider (e.g. age 18–65). Drag either handle; a tap on the track moves the nearer one.
// Built on PanResponder, so it needs no native gesture library.
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { colors, shadow, themed, dk } from "@/theme";

const THUMB = 28;

type Props = {
  min: number;
  max: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  label: string;
};

export function RangeSlider({ min, max, low, high, onChange, label }: Props) {
  const [width, setWidth] = useState(0);
  // Latest props for the touch handlers, which are created once
  const [latest] = useState(() => ({ width: 0, low, high, min, max, onChange, active: "low" as "low" | "high" }));
  useEffect(() => {
    Object.assign(latest, { width, low, high, min, max, onChange });
  });

  const [responder] = useState(() => {
    const valueAt = (x: number) => {
      const s = latest;
      const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / Math.max(1, s.width - THUMB)));
      return Math.round(s.min + ratio * (s.max - s.min));
    };
    const move = (x: number) => {
      const s = latest;
      const v = valueAt(x);
      const lo = s.active === "low" ? Math.min(v, s.high) : s.low;
      const hi = s.active === "high" ? Math.max(v, s.low) : s.high;
      if (lo === s.low && hi === s.high) return;
      s.low = lo;
      s.high = hi;
      Haptics.selectionAsync().catch(() => {});
      s.onChange(lo, hi);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the drag even if the parent ScrollView wants it
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const s = latest;
        const v = valueAt(e.nativeEvent.locationX);
        // Grab whichever handle is nearer the finger
        s.active = v <= s.low ? "low" : v >= s.high ? "high" : v - s.low <= s.high - v ? "low" : "high";
        move(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => move(e.nativeEvent.locationX),
    });
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const xOf = (v: number) => ((v - min) / (max - min)) * Math.max(0, width - THUMB);
  const lowX = xOf(low);
  const highX = xOf(high);

  return (
    <View
      onLayout={onLayout}
      style={styles.area}
      {...responder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={`${label}: ${low} to ${high}`}
    >
      <View pointerEvents="none" style={styles.track} />
      <View pointerEvents="none" style={[styles.fill, { left: lowX + THUMB / 2, width: Math.max(0, highX - lowX) }]} />
      <View pointerEvents="none" style={[styles.thumb, { left: lowX }]} />
      <View pointerEvents="none" style={[styles.thumb, { left: highX }]} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  area: { height: 44, justifyContent: "center" },
  track: { position: "absolute", left: THUMB / 2, right: THUMB / 2, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt },
  fill: { position: "absolute", height: 6, borderRadius: 3, backgroundColor: colors.primary },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: dk("#FFFFFF", "#ECECF8"),
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadow.card,
  },
}));
