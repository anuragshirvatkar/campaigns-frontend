import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { CampaignCard as Campaign } from "@/api/types";
import { Button, ProgressBar, StatusPill, Text } from "@/components/ui";
import { compactNumber, money, percent, reachRange, timeLeft } from "@/lib/format";
import { CATEGORY } from "@/lib/labels";
import { colors, radius, shadow, spacing, themed, dk } from "@/theme";
import { PressScale } from "@/components/ui/motion";

export function openCampaign(c: Pick<Campaign, "id" | "slug">) {
  router.push({ pathname: "/campaign/[id]", params: { id: c.slug ?? c.id } });
}

/** Feed card: image, category, title, creator, summary, funding, reach at goal, one action. */
export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const cat = c.category ? CATEGORY[c.category] : null;
  const left = c.status === "funding" ? timeLeft(c.funding.deadline) : null;

  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${c.title}, by ${c.creatorName}. ${percent(c.funding.percentFunded)} funded.`}
      onPress={() => openCampaign(c)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View>
        <Image source={c.coverImageUrl ? { uri: c.coverImageUrl } : null} style={styles.cover} contentFit="cover" transition={200} />
        <View style={styles.coverBadges}>
          {cat && (
            <View style={styles.categoryBadge}>
              <Ionicons name={cat.icon} size={13} color={cat.tint} />
              <Text variant="caption" color={colors.text} style={styles.badgeText}>
                {cat.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <Text variant="h3" numberOfLines={2}>
          {c.title}
        </Text>
        <Text variant="caption">by {c.creatorName}</Text>
        {c.summary && (
          <Text variant="bodySm" numberOfLines={2} style={styles.summary}>
            {c.summary}
          </Text>
        )}

        <View style={styles.fundingRow}>
          <Text variant="title">
            {money(c.funding.raisedCents)}
            <Text variant="bodySm"> of {money(c.funding.goalCents)}</Text>
          </Text>
          <Text variant="title" color={colors.primary}>
            {percent(c.funding.percentFunded)}
          </Text>
        </View>
        <ProgressBar value={c.funding.percentFunded} label="Funding progress" />

        <View style={styles.metaRow}>
          <Meta icon="people-outline" text={`~${reachRange(c.funding.estimatedReachAtGoal)} reach at goal`} />
          {left ? <Meta icon="time-outline" text={left} /> : <StatusPill status={c.status} />}
        </View>

        {c.status === "funding" ? (
          <Button
            label="Back this campaign"
            icon="megaphone-outline"
            onPress={() => router.push({ pathname: "/campaign/[id]/back", params: { id: c.slug ?? c.id } })}
            style={styles.cta}
          />
        ) : c.status === "promoting" || c.status === "completed" ? (
          <Button
            label={c.status === "completed" ? "See the results" : "See live delivery"}
            variant="secondary"
            icon="bar-chart-outline"
            onPress={() => router.push({ pathname: "/campaign/[id]/report", params: { id: c.slug ?? c.id } })}
            style={styles.cta}
          />
        ) : null}
      </View>
    </PressScale>
  );
}

function Meta({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text variant="caption">{text}</Text>
    </View>
  );
}

/** Narrow card for the horizontal "Featured" rail. */
export function FeaturedCard({ campaign: c }: { campaign: Campaign }) {
  const cat = c.category ? CATEGORY[c.category] : null;
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${c.title}`}
      onPress={() => openCampaign(c)}
      style={({ pressed }) => [styles.featured, pressed && styles.pressed]}
    >
      <Image source={c.coverImageUrl ? { uri: c.coverImageUrl } : null} style={styles.featuredCover} contentFit="cover" transition={200} />
      <View style={styles.featuredBody}>
        {cat && <Text variant="overline" color={cat.tint}>{cat.label}</Text>}
        <Text variant="title" numberOfLines={2} style={{ minHeight: 42 }}>
          {c.title}
        </Text>
        <ProgressBar value={c.funding.percentFunded} height={6} />
        <Text variant="caption">
          {money(c.funding.raisedCents, { compact: true })} raised · {percent(c.funding.percentFunded)}
        </Text>
      </View>
    </PressScale>
  );
}

/** Thumbnail row used in Profile, Activity and the creator dashboard. */
export function CampaignRow({
  campaign: c,
  onPress,
  right,
  subtitle,
}: {
  campaign: Pick<Campaign, "title" | "coverImageUrl" | "status" | "funding" | "category">;
  onPress: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={c.title ?? "Untitled campaign"}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image
        source={c.coverImageUrl ? { uri: c.coverImageUrl } : null}
        style={styles.thumb}
        contentFit="cover"
        placeholder={null}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="title" numberOfLines={2}>
          {c.title || "Untitled campaign"}
        </Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        {c.funding.goalCents ? (
          <>
            <ProgressBar value={c.funding.percentFunded} height={5} />
            <Text variant="caption">
              {money(c.funding.raisedCents)} of {money(c.funding.goalCents)} · {compactNumber(c.funding.backerCount)} backers
            </Text>
          </>
        ) : null}
      </View>
      {right ?? <StatusPill status={c.status} />}
    </PressScale>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.xl, marginBottom: spacing.xl, ...shadow.card },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  cover: { height: 180, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.primarySoft },
  coverBadges: { position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between" },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: dk("rgba(255,255,255,0.95)", "rgba(26,27,48,0.92)"),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: "Rubik_500Medium" },
  body: { padding: spacing.lg, gap: spacing.xs },
  summary: { marginTop: spacing.xs },
  fundingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: spacing.md, marginBottom: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cta: { marginTop: spacing.md },
  featured: { width: 230, backgroundColor: colors.card, borderRadius: radius.lg, marginRight: spacing.md, marginBottom: spacing.md, ...shadow.card },
  featuredCover: { height: 120, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.primarySoft },
  featuredBody: { padding: spacing.md, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySoft },
}));
