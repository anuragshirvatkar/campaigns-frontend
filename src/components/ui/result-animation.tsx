// One-shot result animations for payments.
// Success: the checkmark pops in, two soft rings ripple out and a burst of confetti dots flies off.
// Failure: a red badge drops in and shakes "no", with a single fading ring.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { colors, themed } from "@/theme";

const CHECK = require("../../../assets/images/states/success-check.png");

const SIZE = 210; // the whole stage
const BADGE = 96;
const CONFETTI = themed(() => [colors.primary, colors.teal, colors.amber, colors.coral, colors.primaryMuted, colors.blue]);
const PIECES = 12;

export function ResultAnimation({ kind }: { kind: "success" | "failure" }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const ripple = useSharedValue(reduced ? 1 : 0);
  const burst = useSharedValue(reduced ? 1 : 0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pop.set(withSpring(1, { damping: 9, stiffness: 160 }));
    ripple.set(withDelay(120, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
    if (kind === "success") {
      burst.set(withDelay(150, withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })));
    } else {
      shake.set(
        withDelay(
          320,
          withSequence(
            withTiming(-10, { duration: 60 }),
            withTiming(10, { duration: 80 }),
            withTiming(-7, { duration: 70 }),
            withTiming(7, { duration: 70 }),
            withTiming(0, { duration: 60 }),
          ),
        ),
      );
    }
  }, [kind, reduced, pop, ripple, burst, shake]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ translateX: shake.value }, { scale: 0.4 + pop.value * 0.6 }],
  }));

  const ringColor = kind === "success" ? colors.primary : colors.danger;
  return (
    <View style={styles.stage} accessibilityRole="image" accessibilityLabel={kind === "success" ? "Payment successful" : "Payment failed"}>
      <Ring progress={ripple} color={ringColor} from={0.9} to={1.9} />
      {kind === "success" && <Ring progress={ripple} color={ringColor} from={0.7} to={1.45} delayed />}
      {kind === "success" && Array.from({ length: PIECES }, (_, i) => <Confetti key={i} index={i} progress={burst} />)}
      <Animated.View style={badgeStyle}>
        {kind === "success" ? (
          <Image source={CHECK} style={{ width: BADGE, height: BADGE }} contentFit="contain" />
        ) : (
          <View style={styles.fail}>
            <Ionicons name="close" size={56} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function Ring({ progress, color, from, to, delayed }: { progress: SharedValue<number>; color: string; from: number; to: number; delayed?: boolean }) {
  const style = useAnimatedStyle(() => {
    // The second ring trails the first a little
    const p = delayed ? Math.max(0, (progress.value - 0.15) / 0.85) : progress.value;
    return { opacity: 0.35 * (1 - p), transform: [{ scale: from + (to - from) * p }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color }, style]} />;
}

function Confetti({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const angle = (index / PIECES) * Math.PI * 2 + (index % 2 ? 0.2 : -0.1);
  const distance = 78 + (index % 3) * 16;
  const size = index % 3 === 0 ? 13 : 9;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: 0.4 + p * 0.6 },
        { rotate: `${p * 180}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          width: size,
          height: index % 4 === 1 ? size * 1.8 : size,
          borderRadius: index % 4 === 1 ? 2 : size / 2,
          backgroundColor: CONFETTI[index % CONFETTI.length],
        },
        style,
      ]}
    />
  );
}

const styles = themed(() => StyleSheet.create({
  stage: { width: SIZE, height: SIZE, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 3 },
  piece: { position: "absolute" },
  fail: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
}));
