import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import type { CampaignCard as Campaign } from "@/api/types";
import { Button, ProgressBar, StatusPill, Text } from "@/components/ui";
import { compactNumber, money, percent, reachRange, timeLeft } from "@/lib/format";
import { CATEGORY } from "@/lib/labels";
import { colors, radius, shadow, spacing, themed } from "@/theme";
import { PressScale } from "@/components/ui/motion";
import { showAlert } from "@/components/ui/alert-dialog";

// Supporter faces shown beside the count (backers stay private, so these are illustrative)
const FACES = [
  require("../../../assets/images/home/story-1.jpg"),
  require("../../../assets/images/home/story-2.jpg"),
  require("../../../assets/images/home/story-3.jpg"),
];

export function openCampaign(c: Pick<Campaign, "id" | "slug">) {
  router.push({ pathname: "/campaign/[id]", params: { id: c.slug ?? c.id } });
}

/** Feed card: image, category, title, creator, summary, funding, reach at goal, one action. */
export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const cat = c.category ? CATEGORY[c.category] : null;
  const left = c.status === "funding" ? timeLeft(c.funding.deadline) : null;
  const reach = c.funding.estimatedReachAtGoal;

  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${c.title}. ${percent(c.funding.percentFunded)} funded.`}
      onPress={() => openCampaign(c)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View>
        <Image source={c.coverImageUrl ? { uri: c.coverImageUrl } : null} style={styles.cover} contentFit="cover" transition={200} />
        {cat && (
          <View style={styles.categoryChip}>
            <Ionicons name={cat.icon} size={14} color={cat.tint} />
            <Text style={[styles.categoryText, { color: colors.text }]}>{cat.label}</Text>
          </View>
        )}
      </View>

      {/* Layout from theme references/Screenshot 2026-10-21 213230.png */}
      <View style={styles.body}>
        <Text variant="h3" numberOfLines={2}>
          {c.title}
        </Text>
        {c.summary ? (
          <Text variant="bodySm" numberOfLines={1}>
            {c.summary}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.meta}>
            {c.funding.backerCount > 0 && (
              <View style={[styles.faces, { width: 22 + 16 * (Math.min(3, c.funding.backerCount) - 1) }]}>
                {FACES.slice(0, Math.min(3, c.funding.backerCount)).map((face, i) => (
                  <Image key={i} source={face} style={[styles.face, { left: i * 16 }]} contentFit="cover" />
                ))}
              </View>
            )}
            <Text variant="bodySm" color={colors.text}>
              <Text variant="bodySm" color={colors.text} style={styles.strong}>
                {compactNumber(c.funding.backerCount)}
              </Text>{" "}
              {c.funding.backerCount === 1 ? "supporter" : "supporters"}
            </Text>
          </View>
          {left ? (
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text variant="bodySm" color={colors.text}>
                {left}
              </Text>
            </View>
          ) : (
            <StatusPill status={c.status} />
          )}
        </View>

        <View style={styles.fundingRow}>
          <Text variant="title" style={styles.money}>
            {money(c.funding.raisedCents)}
            <Text variant="bodySm"> of {money(c.funding.goalCents)}</Text>
          </Text>
          <Text variant="title" color={colors.primary} style={styles.strong}>
            {percent(c.funding.percentFunded)}
          </Text>
        </View>
        <ProgressBar value={c.funding.percentFunded} height={9} label="Funding progress" />

        {reach && (
          <View style={styles.reach}>
            <Ionicons name="people-outline" size={18} color={colors.text} />
            <Text variant="bodySm" color={colors.text} style={{ flex: 1 }}>
              <Text variant="bodySm" color={colors.text} style={styles.strong}>
                ~{compactNumber(reach.high).toUpperCase()}
              </Text>{" "}
              can be reached at goal
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About this estimate"
              hitSlop={10}
              onPress={() =>
                showAlert(
                  "Estimated reach",
                  `If the goal is met, the ads should reach about ${reachRange(reach)} people. It's an estimate from typical ad costs, not a guarantee.`,
                )
              }
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {c.status === "funding" ? (
          <Button
            label="Back this campaign"
            icon="megaphone-outline"
            iconRight="chevron-forward"
            onPress={() => router.push({ pathname: "/campaign/[id]/back", params: { id: c.slug ?? c.id } })}
            style={styles.cta}
          />
        ) : c.status === "promoting" || c.status === "completed" ? (
          <Button
            label={c.status === "completed" ? "See the results" : "See live delivery"}
            variant="secondary"
            icon="bar-chart-outline"
            iconRight="chevron-forward"
            onPress={() => router.push({ pathname: "/campaign/[id]/report", params: { id: c.slug ?? c.id } })}
            style={styles.cta}
          />
        ) : null}
      </View>
    </PressScale>
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
  card: { backgroundColor: colors.card, borderRadius: radius.xl, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  cover: { height: 180, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.primarySoft },
  body: { padding: spacing.lg, gap: 6 },
  // On the photo, top right: a white capsule so it reads on any image
  categoryChip: { position: "absolute", top: spacing.md, right: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: colors.card },
  categoryText: { fontFamily: "Rubik_500Medium", fontSize: 12.5, lineHeight: 14, includeFontPadding: false },
  strong: { fontFamily: "Rubik_600SemiBold" },
  money: { fontSize: 18 },
  faces: { height: 26, marginRight: 4 },
  face: { position: "absolute", top: 0, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.card },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  fundingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: spacing.md, marginBottom: 4 },
  reach: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primaryTint },
  cta: { marginTop: spacing.md },
  featured: { width: 230, backgroundColor: colors.card, borderRadius: radius.lg, marginRight: spacing.md, marginBottom: spacing.md, ...shadow.card },
  featuredCover: { height: 120, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.primarySoft },
  featuredBody: { padding: spacing.md, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySoft },
}));
