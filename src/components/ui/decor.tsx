// Decorative shapes from the theme references: floating circles and rings.
// Purely visual, so hidden from screen readers and never intercepting touches.
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors, themed } from "@/theme";

/** A cluster of bubbles placed behind content (empty states, headers). */
export function Bubbles({ variant = "soft" }: { variant?: "soft" | "onPrimary" }) {
  const a = variant === "onPrimary" ? "rgba(255,255,255,0.18)" : colors.primarySoft;
  const b = variant === "onPrimary" ? "rgba(255,255,255,0.28)" : colors.tealSoft;
  const c = variant === "onPrimary" ? colors.teal : colors.teal;
  const t = variant === "onPrimary" ? "rgba(255,255,255,0.55)" : colors.primaryMuted;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 140 120" preserveAspectRatio="xMidYMid meet">
        <Circle cx={22} cy={30} r={14} fill={a} />
        <Circle cx={120} cy={88} r={18} fill={b} />
        <Circle cx={116} cy={22} r={5} fill={c} />
        <Circle cx={30} cy={98} r={4} fill={t} />
        <Circle cx={108} cy={58} r={4} fill={t} />
      </Svg>
    </View>
  );
}

/** Large soft ring + dots for the corner of a hero card. */
export function HeroDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 340 260" preserveAspectRatio="xMaxYMin slice">
        <Circle cx={300} cy={40} r={70} stroke="rgba(255,255,255,0.14)" strokeWidth={26} fill="none" />
        <Circle cx={250} cy={210} r={28} fill="rgba(255,255,255,0.10)" />
        <Circle cx={322} cy={160} r={6} fill="rgba(255,255,255,0.45)" />
        <Path d="M0 230 C 80 200, 160 260, 340 215 L340 260 L0 260 Z" fill="rgba(255,255,255,0.08)" />
      </Svg>
    </View>
  );
}

/** Soft wave across the top of a screen, like the reference dashboards. */
export function TopWave({ height = 220 }: { height?: number }) {
  return (
    <View pointerEvents="none" style={[styles.wave, { height }]} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 375 220" preserveAspectRatio="none">
        <Path d="M0 0 H375 V150 C 300 200, 220 120, 140 160 C 80 190, 30 170, 0 180 Z" fill={colors.primaryTint} />
        <Circle cx={330} cy={50} r={36} stroke={colors.primarySoft} strokeWidth={12} fill="none" />
        <Circle cx={40} cy={40} r={6} fill={colors.tealSoft} />
      </Svg>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wave: { position: "absolute", top: 0, left: 0, right: 0 },
}));
