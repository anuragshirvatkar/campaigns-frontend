// Launch animation shown over the app as it starts: the dot appears, then the arcs one by one. It plays
// twice, ending on the full logo, then fades away. The native splash before it is plain white.
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { themed, colors } from "@/theme";
import { LOGO_PARTS, LogoPart } from "./logo-mark";

const SIZE = 160;
const IN = 240;
const STAGGER = 220;
const HOLD = 380;
const OUT = 180;

function Layer({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    // The dot pops; the arcs ripple outward from it
    return index === 0
      ? { opacity: p, transform: [{ scale: 0.4 + p * 0.6 }] }
      : { opacity: p, transform: [{ translateX: (1 - p) * -10 }, { scale: 0.92 + p * 0.08 }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <LogoPart index={index} size={SIZE} />
    </Animated.View>
  );
}

/** Plays once `ready` is true (the app underneath has loaded), then fades away and unmounts. */
export function AnimatedSplash({ ready }: { ready: boolean }) {
  const [done, setDone] = useState(false);
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (!ready) return;
    const ease = { duration: IN, easing: Easing.out(Easing.back(1.4)) };
    // One pass: parts appear in turn, the full logo holds, then it clears
    const shown = STAGGER * 3 + IN + HOLD;
    [p0, p1, p2, p3].forEach((v, i) => {
      v.set(
        withSequence(
          withDelay(STAGGER * i, withTiming(1, ease)),
          withDelay(shown - STAGGER * i - IN, withTiming(0, { duration: OUT })),
          withDelay(120 + STAGGER * i, withTiming(1, ease)),
        ),
      );
    });
    fade.set(
      withDelay(
        shown * 2 + OUT + 120,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(setDone)(true);
        }),
      ),
    );
  }, [ready, p0, p1, p2, p3, fade]);

  const overlay = useAnimatedStyle(() => ({ opacity: fade.get() }));
  if (done) return null;

  const parts = [p0, p1, p2, p3];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlay]} pointerEvents="none">
      <View style={{ width: SIZE, height: SIZE }}>
        {LOGO_PARTS.map((_, i) => (
          <Layer key={i} index={i} progress={parts[i]!} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = themed(() => StyleSheet.create({
  overlay: { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", zIndex: 1000 },
}));
