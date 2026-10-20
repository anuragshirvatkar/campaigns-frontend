// Full-screen preview of the campaign page, built from the unsaved form, before submitting.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, Card, Text } from "@/components/ui";
import { AdPreview } from "@/features/campaigns/ad-preview";
import { SourceList, StoryBlocks } from "@/features/campaigns/story";
import { money } from "@/lib/format";
import { CATEGORY, CHANNEL, CREATOR_TYPE } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed } from "@/theme";
import type { DraftForm } from "./use-draft";

export function CampaignPreviewModal({ visible, onClose, form }: { visible: boolean; onClose: () => void; form: DraftForm }) {
  const insets = useSafeAreaInsets();
  const cat = form.category ? CATEGORY[form.category] : null;
  const blocks = form.storyBlocks.filter((b) => b.type !== "image" || b.url);
  const r = form.reach;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          <View>
            {form.coverImageUrl ? (
              <Image source={{ uri: form.coverImageUrl }} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.cover, styles.noCover]}>
                <Ionicons name="image-outline" size={40} color={colors.primaryMuted} />
              </View>
            )}
            <View style={[styles.badge, { top: insets.top + spacing.md }]}>
              <Ionicons name="eye-outline" size={14} color={colors.primary} />
              <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
                PREVIEW · not published
              </Text>
            </View>
          </View>
          <View style={styles.body}>
            {cat && <Text variant="overline" color={cat.tint}>{cat.label}</Text>}
            <Text variant="h1">{form.title || "Untitled campaign"}</Text>
            <View style={styles.creator}>
              <Avatar name={form.creatorName || "?"} size={36} />
              <View>
                <Text variant="title">{form.creatorName || "Creator name"}</Text>
                <Text variant="caption">{form.creatorType ? CREATOR_TYPE[form.creatorType] : "Creator"}</Text>
              </View>
            </View>
            {!!form.summary && (
              <Text variant="body" color={colors.textMuted}>
                {form.summary}
              </Text>
            )}
            <View style={styles.goal}>
              <Text variant="title">Goal {money(form.fundingGoalCents)}</Text>
              <Text variant="caption">{form.durationDays ? `${form.durationDays}-day funding period` : "Funding period not set"}</Text>
            </View>

            <Text variant="overline" style={{ marginTop: spacing.lg }}>
              The story
            </Text>
            {!!form.storyHeadline && <Text variant="h2">{form.storyHeadline}</Text>}
            {!!form.storyIntro && (
              <Text variant="article" color={colors.textMuted}>
                {form.storyIntro}
              </Text>
            )}
            <StoryBlocks blocks={blocks} sources={form.sources} />

            <Text variant="h3" style={{ marginTop: spacing.xl }}>
              Sources
            </Text>
            <Card padded={false}>
              <SourceList sources={form.sources} />
            </Card>

            <Text variant="h3" style={{ marginTop: spacing.xl }}>
              Audience
            </Text>
            <Text variant="body">{form.targetAudience || "—"}</Text>
            <Text variant="bodySm">
              {r.locations.join(", ") || "No locations"} · ages {r.ageMin ?? 18}–{r.ageMax ?? 65} · {r.channels.map((c) => CHANNEL[c]?.label).join(" & ") || "no channels"}
            </Text>

            <Text variant="h3" style={{ marginTop: spacing.xl }}>
              The ad
            </Text>
            {(r.channels.length ? r.channels : (["facebook"] as const)).map((ch) => (
              <AdPreview
                key={ch}
                placement={ch}
                creatorName={form.creatorName}
                headline={form.adHeadline || form.title.slice(0, 40)}
                description={form.adDescription}
                ctaText={form.ctaText}
                imageUrl={form.adAssets.find((a) => a.type === "image")?.url ?? form.coverImageUrl}
              />
            ))}
          </View>
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="Back to editing" icon="create-outline" onPress={onClose} block />
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  cover: { width: "100%", height: 260, backgroundColor: colors.primarySoft },
  noCover: { alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  body: { padding: spacing.xl, gap: spacing.md },
  creator: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  goal: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.divider },
}));
