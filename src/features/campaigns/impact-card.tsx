// Lavender headline card at the top of Backed and My campaigns: one big amount with an
// illustration on the right, and small stat tiles underneath.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, type ImageSource } from "expo-image";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, shadow, spacing, themed } from "@/theme";

export type ImpactStat = { icon: IconName; value: string; label: string };

export function ImpactCard({
  art,
  overline,
  value,
  caption,
  stats,
}: {
  art: ImageSource;
  overline: string;
  value: string;
  caption: string;
  stats: ImpactStat[];
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.blob} />
      <Image source={art} style={styles.art} contentFit="contain" accessibilityIgnoresInvertColors />
      <View style={{ width: "58%", gap: 2 }}>
        <Text variant="overline" color={colors.textMuted}>
          {overline}
        </Text>
        <Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </Text>
        <Text variant="bodySm">{caption}</Text>
      </View>
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Ionicons name={s.icon} size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="h3">{s.value}</Text>
              <Text variant="caption">{s.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    hero: {
      padding: spacing.xl,
      borderRadius: radius.xl,
      backgroundColor: colors.primaryTint,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      marginBottom: spacing.sm,
      overflow: "hidden",
      ...shadow.card,
    },
    // Soft lighter shape behind the illustration
    blob: { position: "absolute", right: -30, top: 0, width: 200, height: 160, borderRadius: 100, backgroundColor: colors.primarySoft },
    art: { position: "absolute", right: 4, top: 18, width: 150, height: 122 },
    value: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: colors.primary, includeFontPadding: false },
    stats: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
    stat: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      ...shadow.card,
    },
  }),
);
