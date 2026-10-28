// Renders a campaign story the same way on the public page, the live preview and the submit step.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import type { Source, StoryBlock } from "@/api/types";
import type { IconName } from "@/lib/labels";
import { Text } from "@/components/ui";
import { colors, fonts, radius, spacing, themed } from "@/theme";

/** Paragraphs support simple Markdown: **bold**, *italic* and "- " bullet lines. */
function InlineText({ text, variant = "article" }: { text: string; variant?: "article" | "body" }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text variant={variant}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} variant={variant} style={{ fontFamily: fonts.semibold }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith("*") && p.endsWith("*") ? (
          <Text key={i} variant={variant} style={{ fontStyle: "italic" }}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

function Paragraph({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <View style={{ gap: spacing.sm }}>
      {lines.map((line, i) =>
        /^\s*[-•]\s+/.test(line) ? (
          <View key={i} style={styles.bullet}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <InlineText text={line.replace(/^\s*[-•]\s+/, "")} />
            </View>
          </View>
        ) : line.trim() ? (
          <InlineText key={i} text={line} />
        ) : null,
      )}
    </View>
  );
}

export function StoryBlocks({ blocks, sources, statIcon = "stats-chart" }: { blocks: StoryBlock[]; sources: Source[]; statIcon?: IconName }) {
  const sourceIndex = new Map(sources.map((s, i) => [s.id, i + 1]));
  return (
    <View style={{ gap: spacing.xl }}>
      {blocks.map((b, i) => {
        const key = b.id ?? String(i);
        switch (b.type) {
          case "heading":
            return (
              <Text key={key} variant="h2" accessibilityRole="header" style={{ marginTop: spacing.sm }}>
                {b.text}
              </Text>
            );
          case "paragraph":
            return <Paragraph key={key} text={b.text} />;
          case "image":
            return (
              <View key={key} style={{ gap: spacing.sm }}>
                <Image
                  source={{ uri: b.url }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                  accessibilityLabel={b.caption || "Story image"}
                />
                {(b.caption || b.credit) && (
                  <Text variant="caption">
                    {b.caption}
                    {b.credit ? `${b.caption ? " · " : ""}Photo: ${b.credit}` : ""}
                  </Text>
                )}
              </View>
            );
          case "stat": {
            const n = b.sourceId ? sourceIndex.get(b.sourceId) : undefined;
            return (
              <View key={key} style={styles.stat}>
                <View style={styles.statIcon}>
                  <Ionicons name={statIcon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="h2" color={colors.primary} style={{ fontFamily: fonts.bold }}>
                    {b.value}
                  </Text>
                  <Text variant="bodySm">
                    {b.label}
                    {n ? <Text variant="caption" color={colors.primary}>{`  [${n}]`}</Text> : null}
                  </Text>
                </View>
              </View>
            );
          }
          case "action":
            return (
              <Pressable
                key={key}
                accessibilityRole={b.url ? "link" : "text"}
                disabled={!b.url}
                onPress={() => b.url && Linking.openURL(b.url)}
                style={styles.action}
              >
                <Ionicons name="hand-right-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text variant="overline">What you can do</Text>
                  <Text variant="title">{b.label}</Text>
                </View>
                {b.url && <Ionicons name="open-outline" size={18} color={colors.primary} />}
              </Pressable>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

/** Numbered sources, always visible to readers: plain rows separated by hairlines (sit inside a card). */
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return (
      <Text variant="bodySm" style={{ padding: spacing.lg }}>
        {"The creator hasn't listed sources for this campaign."}
      </Text>
    );
  }
  return (
    <View>
      {sources.map((s, i) => (
        <Pressable
          key={s.id}
          accessibilityRole="link"
          accessibilityLabel={`Source ${i + 1}: ${s.title}`}
          onPress={() => Linking.openURL(s.url)}
          style={({ pressed }) => [styles.source, i > 0 && styles.sourceDivider, pressed && { backgroundColor: colors.primaryTint }]}
        >
          <View style={styles.sourceNum}>
            <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
              {i + 1}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={2}>
              {s.title}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {s.url.replace(/^https?:\/\//, "")}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bullet: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 12 },
  image: { width: "100%", aspectRatio: 16 / 10, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.card },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    borderStyle: "dashed",
  },
  source: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 60 },
  sourceDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sourceNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
}));
