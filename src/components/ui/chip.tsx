import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import type { IconName } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";
import { Text } from "./text";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
  onRemove?: () => void;
  size?: "md" | "sm";
};

export function Chip({ label, selected, onPress, icon, count, onRemove, size = "md" }: Props) {
  const fg = selected ? colors.textOnDark : colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      disabled={!onPress}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        selected ? styles.selected : styles.idle,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? fg : colors.primary} />}
      <Text variant="title" color={fg} style={size === "sm" ? styles.smText : styles.text}>
        {label}
      </Text>
      {count !== undefined && (
        <View style={[styles.count, selected && styles.countSelected]}>
          <Text variant="caption" color={selected ? colors.primary : colors.textMuted} style={styles.countText}>
            {count}
          </Text>
        </View>
      )}
      {onRemove && (
        <Pressable accessibilityLabel={`Remove ${label}`} hitSlop={10} onPress={onRemove}>
          <Ionicons name="close" size={15} color={selected ? fg : colors.textMuted} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  sm: { minHeight: 32, paddingHorizontal: spacing.md },
  idle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary },
  text: { fontSize: 14 },
  smText: { fontSize: 13 },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  countSelected: { backgroundColor: colors.card },
  countText: { fontSize: 11, lineHeight: 14 },
}));
