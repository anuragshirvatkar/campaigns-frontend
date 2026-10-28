// System / Light / Dark choice, used by Account settings and the admin's Account tab.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed, type ThemeMode } from "@/theme";
import { useTheme } from "@/theme/theme-provider";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: "system", label: "System", icon: "phone-portrait-outline" },
  { mode: "light", label: "Light", icon: "sunny-outline" },
  { mode: "dark", label: "Dark", icon: "moon-outline" },
];

export function ThemePicker() {
  const { mode, setMode } = useTheme();
  return (
    <View>
      <View style={styles.themeRow} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((o) => {
          const on = o.mode === mode;
          return (
            <Pressable
              key={o.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => !on && setMode(o.mode)}
              style={({ pressed }) => [styles.themeOption, on && styles.themeOptionOn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name={o.icon} size={22} color={on ? colors.primary : colors.textMuted} />
              <Text style={[styles.themeLabel, { color: on ? colors.primary : colors.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" style={{ marginTop: spacing.sm }}>
        System follows your phone’s dark mode setting.
      </Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    themeRow: { flexDirection: "row", gap: spacing.sm },
    themeOption: {
      flex: 1,
      minHeight: 76,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    themeOptionOn: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
    },
    themeLabel: { fontFamily: fonts.medium, fontSize: 14 },
  }),
);
