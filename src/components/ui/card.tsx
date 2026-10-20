import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadow, spacing, themed } from "@/theme";
import { PressScale } from "./motion";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** "flat" sits on white screens without a shadow; "tinted" is the lavender wash */
  tone?: "raised" | "flat" | "tinted";
  padded?: boolean;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, style, tone = "raised", padded = true, accessibilityLabel }: Props) {
  const body = [styles.base, toneStyle[tone], padded && styles.padded, style];
  if (!onPress) return <View style={body}>{children}</View>;
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [body, pressed && styles.pressed]}
    >
      {children}
    </PressScale>
  );
}

const toneStyle = themed(() => StyleSheet.create({
  raised: { backgroundColor: colors.card, ...shadow.card },
  flat: { backgroundColor: colors.surface },
  tinted: { backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.primarySoft },
}));

const styles = themed(() => StyleSheet.create({
  base: { borderRadius: radius.lg },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
}));
