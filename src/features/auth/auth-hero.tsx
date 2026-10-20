import { Image, type ImageSource } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LOGIN, type Scale } from "./login-kit";

/** An image placed in reference px from the screen's top-left. ratio = height / width. */
export type Piece = { src: ImageSource; x: number; y: number; w: number; ratio: number; rotate?: number };

export type HeroArt = {
  circle: { cx: number; cy: number; r: number };
  /** Drawn first, never animated (globe, seat and plant) */
  scenery: Piece[];
  /** The character: sways a few degrees around `pivot` (e.g. "73% 64%", where they sit) */
  figure: Piece & { pivot: string };
  /** Reactions that drift up into place, one after another */
  floaters: Piece[];
  /** Sound/spark lines that burst out from their `origin` side twice */
  burst: Piece & { origin: string };
};

function box(p: Piece, u: Scale) {
  return { position: "absolute" as const, left: u(p.x), top: u(p.y), width: u(p.w), height: u(p.w * p.ratio) };
}

const FLOAT_DELAYS = [0, 110, 200];

/** Auth screen illustration: a one-second intro, then everything stays still. */
export function AuthHero({ art, u }: { art: HeroArt; u: Scale }) {
  const reduceMotion = useReducedMotion();
  const sway = useSharedValue(0);
  const riseA = useSharedValue(0);
  const riseB = useSharedValue(0);
  const riseC = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    const rises = [riseA, riseB, riseC];
    if (reduceMotion) {
      rises.forEach((r) => r.set(1));
      burst.set(1);
      return;
    }
    const ease = Easing.inOut(Easing.quad);
    sway.set(
      withSequence(
        withTiming(-5, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(3, { duration: 300, easing: ease }),
        withTiming(-1.2, { duration: 240, easing: ease }),
        withTiming(0, { duration: 220, easing: ease }),
      ),
    );
    FLOAT_DELAYS.forEach((delay, i) => {
      rises[i].set(withDelay(delay, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) })));
    });
    burst.set(
      withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 150 }),
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 150 }),
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [reduceMotion, sway, riseA, riseB, riseC, burst]);

  const figureStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value}deg` }] }));
  const burstShift = u(10);
  const burstRotate = `${art.burst.rotate ?? 0}deg`;
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value,
    transform: [{ rotate: burstRotate }, { translateX: (1 - burst.value) * burstShift }, { scale: 0.6 + 0.4 * burst.value }],
  }));
  const rises = [riseA, riseB, riseC];
  const { circle } = art;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: "absolute",
          left: u(circle.cx - circle.r),
          top: u(circle.cy - circle.r),
          width: u(circle.r * 2),
          height: u(circle.r * 2),
          borderRadius: u(circle.r),
          backgroundColor: LOGIN.heroCircle,
        }}
      />
      {art.scenery.map((p, i) => (
        <Image key={i} source={p.src} style={box(p, u)} contentFit="contain" />
      ))}
      <Animated.View style={[box(art.figure, u), { transformOrigin: art.figure.pivot }, figureStyle]}>
        <Image source={art.figure.src} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>
      {art.floaters.slice(0, 3).map((p, i) => (
        <Floater key={i} piece={p} progress={rises[i]} u={u} />
      ))}
      <Animated.View style={[box(art.burst, u), { transformOrigin: art.burst.origin }, burstStyle]}>
        <Image source={art.burst.src} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

/** A reaction that drifts up into its resting place. */
function Floater({ piece, progress, u }: { piece: Piece; progress: SharedValue<number>; u: Scale }) {
  const lift = u(46);
  const rotate = `${piece.rotate ?? 0}deg`;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [0, 1], "clamp"),
    transform: [{ translateY: (1 - progress.value) * lift }, { scale: 0.7 + 0.3 * progress.value }, { rotate }],
  }));
  return (
    <Animated.View style={[box(piece, u), style]}>
      <Image source={piece.src} style={StyleSheet.absoluteFill} contentFit="contain" />
    </Animated.View>
  );
}

// Shared reactions (login assets)
export const REACTIONS = {
  heartBlue: require("../../../assets/images/login/heart-blue.png"),
  heartViolet: require("../../../assets/images/login/heart-violet.png"),
  stat: require("../../../assets/images/login/stat.png"),
  wave: require("../../../assets/images/login/wave.png"),
};
export const RATIOS = { heartBlue: 207 / 200, heartViolet: 185 / 200, stat: 211 / 220, wave: 220 / 160 };

// Placements measured against theme references/login-screen-reference.png
export const LOGIN_ART: HeroArt = {
  circle: { cx: 575, cy: 305, r: 220 },
  scenery: [{ src: require("../../../assets/images/login/globe.png"), x: 334, y: 377.5, w: 660, ratio: 499 / 900 }],
  figure: { src: require("../../../assets/images/login/woman.png"), x: 379, y: 276, w: 343, ratio: 703 / 640, pivot: "73% 64%" },
  floaters: [
    { src: REACTIONS.heartBlue, x: 433, y: 216, w: 58, ratio: RATIOS.heartBlue },
    { src: REACTIONS.stat, x: 555, y: 171, w: 100, ratio: RATIOS.stat },
    { src: REACTIONS.heartViolet, x: 635, y: 272, w: 64, ratio: RATIOS.heartViolet },
  ],
  burst: { src: REACTIONS.wave, x: 424, y: 296, w: 44, ratio: RATIOS.wave, origin: "100% 50%" },
};

// Laid out after theme references/signup-screen-reference.png: he sits on the seat, plant beside him
export const SIGNUP_ART: HeroArt = {
  circle: { cx: 590, cy: 400, r: 185 },
  scenery: [{ src: require("../../../assets/images/signup/seat-plant.png"), x: 430, y: 318, w: 290, ratio: 491 / 600 }],
  figure: { src: require("../../../assets/images/signup/man.png"), x: 333, y: 273, w: 280, ratio: 586 / 600, pivot: "90% 71%" },
  floaters: [
    { src: REACTIONS.stat, x: 372, y: 178, w: 88, ratio: RATIOS.stat },
    { src: REACTIONS.heartViolet, x: 486, y: 214, w: 56, ratio: RATIOS.heartViolet },
    { src: REACTIONS.heartBlue, x: 612, y: 128, w: 56, ratio: RATIOS.heartBlue },
  ],
  burst: { src: REACTIONS.wave, x: 396, y: 318, w: 34, ratio: RATIOS.wave, origin: "100% 100%", rotate: 35 },
};
