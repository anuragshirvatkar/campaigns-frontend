// What the campaign editor shows while Sam is building the campaign: a bar saying so (with Exit), and
// a blurred "Sam is creating your image" card with a light running around its border.
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useState, type RefObject } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Text } from "@/components/ui";
import { colors, dk, fonts, isDark, radius, shadow, spacing, themed } from "@/theme";

const SAM_IMAGE = require("../../../assets/images/sam.png");

/** Under the step bar while Sam drives: who's in charge, and the way out. */
export function SamModeBar({ yourTurn, talking, onExit }: { yourTurn: boolean; talking: boolean; onExit: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.bar}>
      <Image source={SAM_IMAGE} style={styles.barAvatar} contentFit="contain" />
      <View style={{ flex: 1 }}>
        <Text style={styles.barTitle}>{yourTurn ? "Your turn" : "Creating with Sam"}</Text>
        <Text variant="caption" numberOfLines={2}>
          {yourTurn
            ? "Check everything, tick the rules box and submit."
            : talking
              ? "Sam is filling this in. You can edit once he's done talking."
              : "Edit anything here yourself, or tap Sam to talk."}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onExit} hitSlop={8} style={styles.exit}>
        <Text style={styles.exitText}>Exit</Text>
      </Pressable>
    </Animated.View>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const STROKE = 3;
const CORNER = 22;

/** Blurs the editor while Sam's image is on the way; the card's border has a light running around it. */
export function SamImageOverlay({ kind, blurTarget }: { kind: "cover" | "ad"; blurTarget: RefObject<View | null> }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const run = useSharedValue(0);
  useEffect(() => {
    run.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false));
  }, [run]);

  // The rounded rectangle's length, so the light can travel exactly once around it per loop
  const w = size.w - STROKE;
  const h = size.h - STROKE;
  const perimeter = w > 0 && h > 0 ? 2 * (w + h - 2 * CORNER) + 2 * Math.PI * CORNER : 0;
  const light = perimeter * 0.28;
  const props = useAnimatedProps(() => ({ strokeDashoffset: -run.value * perimeter }));

  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={45}
        tint={isDark() ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {perimeter > 0 && (
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <LinearGradient id="run" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#7C5CFF" />
                  <Stop offset="1" stopColor="#C084FC" />
                </LinearGradient>
              </Defs>
              {/* Faint track, and the light running along it */}
              <Rect x={STROKE / 2} y={STROKE / 2} width={w} height={h} rx={CORNER} stroke={colors.primarySoft} strokeWidth={STROKE} fill="none" />
              <AnimatedRect
                x={STROKE / 2}
                y={STROKE / 2}
                width={w}
                height={h}
                rx={CORNER}
                stroke="url(#run)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={[light, perimeter - light]}
                animatedProps={props}
              />
            </Svg>
          )}
          <Image source={SAM_IMAGE} style={styles.cardAvatar} contentFit="contain" />
          <Text style={styles.cardTitle}>Sam is creating your {kind === "cover" ? "cover image" : "ad image"}</Text>
          <Text variant="bodySm" align="center">
            It takes about 30 seconds and appears in your campaign by itself.
          </Text>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.primarySoft,
    },
    barAvatar: { width: 36, height: 36, borderRadius: 18 },
    barTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
    exit: {
      paddingHorizontal: spacing.md,
      minHeight: 36,
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: colors.card,
    },
    exitText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
    scrim: { backgroundColor: dk("rgba(247,246,255,0.45)", "rgba(15,16,32,0.5)") },
    center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: spacing.xl },
    card: {
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.xl,
      borderRadius: CORNER,
      backgroundColor: colors.card,
      ...shadow.card,
    },
    cardAvatar: { width: 56, height: 56, borderRadius: 28 },
    cardTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, textAlign: "center" },
  }),
);
