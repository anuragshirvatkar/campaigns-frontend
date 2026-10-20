import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { IconName } from "@/lib/labels";
import { colors, dk, radius, spacing, TOUCH, themed } from "@/theme";
import { Text } from "./text";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: "md" | "sm";
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** One gentle grow-and-settle shortly after it appears, to draw the eye to the main action */
  pulse?: boolean;
};

const PRESS = { damping: 15, stiffness: 320 };

const VARIANTS: Record<Variant, { bg: string; bgPressed: string; fg: string; border?: string }> = themed(() => ({
  primary: { bg: colors.primary, bgPressed: colors.primaryPressed, fg: colors.textOnDark },
  secondary: { bg: colors.primarySoft, bgPressed: dk("#E1DCFF", "#352F6A"), fg: colors.primary },
  outline: { bg: colors.card, bgPressed: colors.primaryTint, fg: colors.primary, border: colors.primaryMuted },
  ghost: { bg: "transparent", bgPressed: colors.primaryTint, fg: colors.primary },
  danger: { bg: colors.dangerSoft, bgPressed: dk("#FBDAD8", "#4A2428"), fg: colors.danger },
}));

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  disabled,
  block,
  style,
  accessibilityHint,
  pulse,
}: Props) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (!pulse || reduced) return;
    scale.set(withDelay(900, withSequence(withTiming(1.06, { duration: 180 }), withSpring(1, { damping: 6, stiffness: 180 }))));
  }, [pulse, reduced, scale]);

  // Layout styles (flex, width, margins) go on the animated wrapper; the Pressable fills it
  return (
    <Animated.View style={[block && styles.block, style, animated]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!inactive, busy: !!loading }}
        disabled={inactive}
        onPressIn={() => scale.set(withSpring(0.96, PRESS))}
        onPressOut={() => scale.set(withSpring(1, PRESS))}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.base,
          size === "sm" ? styles.sm : styles.md,
          { backgroundColor: pressed ? v.bgPressed : v.bg },
          v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
          inactive && !loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <View style={styles.row}>
            {icon && <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={v.fg} />}
            <Text variant="button" color={v.fg} style={[size === "sm" ? styles.smText : null, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {label}
            </Text>
            {iconRight && <Ionicons name={iconRight} size={size === "sm" ? 16 : 18} color={v.fg} />}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  label: string; // accessibility label; icons alone don't say what they do
  variant?: "plain" | "soft" | "floating";
  color?: string;
  size?: number;
  disabled?: boolean;
};

export function IconButton({ icon, onPress, label, variant = "plain", color, size = 22, disabled }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        variant === "soft" && { backgroundColor: colors.primarySoft },
        variant === "floating" && styles.floating,
        pressed && { opacity: 0.6 },
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? (variant === "soft" ? colors.primary : colors.text)} />
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  md: { minHeight: 52, paddingHorizontal: spacing.xl },
  sm: { minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.sm },
  smText: { fontSize: 13 },
  block: { alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  disabled: { opacity: 0.45 },
  icon: {
    width: TOUCH - 4,
    height: TOUCH - 4,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  floating: {
    backgroundColor: dk("rgba(255,255,255,0.94)", "rgba(26,27,48,0.94)"),
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
}));
