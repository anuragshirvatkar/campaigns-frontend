// Mock placements showing how the ad may appear. Approximate, labelled as previews.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import type { Channel } from "@/api/types";
import { Avatar, Text } from "@/components/ui";
import { colors, fonts, radius, spacing, themed } from "@/theme";

type Props = {
  placement: Channel;
  creatorName: string | null;
  headline: string | null;
  description: string | null;
  ctaText: string | null;
  imageUrl: string | null;
};

export function AdPreview({ placement, creatorName, headline, description, ctaText, imageUrl }: Props) {
  const name = creatorName || "Your name";
  const image = imageUrl ? (
    <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
  ) : (
    <View style={[styles.image, styles.noImage]}>
      <Ionicons name="image-outline" size={32} color={colors.primaryMuted} />
      <Text variant="caption">No ad image yet</Text>
    </View>
  );

  if (placement === "instagram") {
    return (
      <View style={styles.frame} accessibilityLabel="Instagram feed preview">
        <View style={styles.header}>
          <Avatar name={name} size={28} />
          <View style={{ flex: 1 }}>
            <Text variant="title" style={styles.small}>
              {name.toLowerCase().replace(/\s+/g, "")}
            </Text>
            <Text variant="caption" style={styles.tiny}>
              Sponsored
            </Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
        </View>
        {image}
        <View style={styles.igCta}>
          <Text variant="title" style={styles.small}>
            {ctaText || "Learn more"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.text} />
        </View>
        <View style={styles.igIcons}>
          <Ionicons name="heart-outline" size={20} color={colors.text} />
          <Ionicons name="chatbubble-outline" size={19} color={colors.text} />
          <Ionicons name="paper-plane-outline" size={19} color={colors.text} />
        </View>
        <Text variant="bodySm" color={colors.text} style={styles.caption} numberOfLines={3}>
          <Text variant="bodySm" color={colors.text} style={{ fontFamily: fonts.semibold }}>
            {name.toLowerCase().replace(/\s+/g, "")}{" "}
          </Text>
          {headline || "Your ad headline"} — {description || "Your ad description"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame} accessibilityLabel="Facebook feed preview">
      <View style={styles.header}>
        <Avatar name={name} size={32} />
        <View style={{ flex: 1 }}>
          <Text variant="title" style={styles.small}>
            {name}
          </Text>
          <Text variant="caption" style={styles.tiny}>
            Sponsored · <Ionicons name="earth" size={10} color={colors.textMuted} />
          </Text>
        </View>
      </View>
      <Text variant="bodySm" color={colors.text} style={styles.caption} numberOfLines={3}>
        {description || "Your ad description appears here."}
      </Text>
      {image}
      <View style={styles.fbFooter}>
        <Text variant="title" style={[styles.small, { flex: 1 }]} numberOfLines={2}>
          {headline || "Your ad headline"}
        </Text>
        <View style={styles.fbCta}>
          <Text variant="caption" color={colors.text} style={{ fontFamily: fonts.semibold }}>
            {ctaText || "Learn more"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  frame: { backgroundColor: colors.card, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  small: { fontSize: 13, lineHeight: 17 },
  tiny: { fontSize: 11, lineHeight: 14 },
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.primaryTint },
  noImage: { alignItems: "center", justifyContent: "center", gap: spacing.xs },
  caption: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  igCta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  igIcons: { flexDirection: "row", gap: spacing.md, padding: spacing.md, paddingBottom: spacing.sm },
  fbFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface },
  fbCta: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.border },
}));
