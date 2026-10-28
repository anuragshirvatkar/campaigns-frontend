// Shared pieces of the admin app: the header, the sliding tab switch, queue rows and decision badges.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import type { AdminCampaignCard, AiSuggestion, ReviewDecision } from "@/api/types";
import { Avatar, Card, Text } from "@/components/ui";
import { CampaignThumb } from "@/features/campaigns/campaign-parts";
import { useAuth } from "@/features/auth/auth-provider";
import { money, percent, timeAgo } from "@/lib/format";
import { CATEGORY, type IconName } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed } from "@/theme";

const LOGO = require("../../../assets/images/logo.png");

/** Logo, screen title and the admin's avatar (opens Account). */
export function AdminHeader({ title }: { title: string }) {
  const { user } = useAuth();
  return (
    <View style={styles.header}>
      <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityIgnoresInvertColors />
      <Text variant="h2" maxFontSizeMultiplier={1.2} accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Account" onPress={() => router.navigate("/account")} hitSlop={8}>
        <Avatar name={user?.fullName ?? "Admin"} url={user?.avatarUrl} size={40} />
      </Pressable>
    </View>
  );
}

export type SegmentItem<K extends string> = { key: K; label: string; count?: number; icon?: IconName };

type Box = { x: number; width: number };

/**
 * Tabs across the top in equal segments, each label with its count on one line; a white thumb
 * springs under the chosen one.
 */
export function SegmentTabs<K extends string>({ items, value, onChange }: { items: SegmentItem<K>[]; value: K; onChange: (k: K) => void }) {
  const [boxes, setBoxes] = useState<Partial<Record<K, Box>>>({});
  const box = boxes[value];
  return (
    <View style={styles.segments} accessibilityRole="tablist">
      <View style={styles.segmentRow}>
        {/* Positioned from layout state; the layout transition springs it to each new tab */}
        {box && <Animated.View layout={LinearTransition.springify().damping(20).stiffness(240).mass(0.7)} style={[styles.thumb, { left: box.x, width: box.width }]} />}
        {items.map((item) => {
          const on = item.key === value;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={item.count !== undefined ? `${item.label}, ${item.count}` : item.label}
              onLayout={(e) => {
                const { x: bx, width } = e.nativeEvent.layout;
                setBoxes((all) => (all[item.key]?.x === bx && all[item.key]?.width === width ? all : { ...all, [item.key]: { x: bx, width } }));
              }}
              onPress={() => {
                if (on) return;
                Haptics.selectionAsync().catch(() => {});
                onChange(item.key);
              }}
              style={styles.segment}
            >
              <Text
                numberOfLines={1}
                // Shrinks a little on narrow phones rather than wrapping or cutting the label
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxFontSizeMultiplier={1.1}
                style={[styles.segmentText, { color: on ? colors.text : colors.textMuted, fontFamily: on ? fonts.semibold : fonts.medium }]}
              >
                {item.label}
              </Text>
              {item.count !== undefined && (
                <View style={[styles.count, on && { backgroundColor: colors.primary }]}>
                  <Text maxFontSizeMultiplier={1} style={[styles.countText, on && { color: colors.textOnDark }]}>
                    {item.count > 99 ? "99+" : item.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const DECISION: Record<ReviewDecision, { label: string; icon: IconName; tone: "success" | "warning" | "danger" }> = {
  approved: { label: "Approve", icon: "checkmark-circle", tone: "success" },
  changes_requested: { label: "Needs changes", icon: "create", tone: "warning" },
  rejected: { label: "Reject", icon: "close-circle", tone: "danger" },
};

export function toneColors(tone: "success" | "warning" | "danger" | "primary") {
  return tone === "success"
    ? { fg: colors.success, bg: colors.successSoft }
    : tone === "warning"
      ? { fg: colors.warning, bg: colors.warningSoft }
      : tone === "danger"
        ? { fg: colors.danger, bg: colors.dangerSoft }
        : { fg: colors.primary, bg: colors.primarySoft };
}

/** "AI suggests: Approve", a small sparkle chip. */
export function SuggestionChip({ suggestion }: { suggestion: AiSuggestion | null }) {
  if (!suggestion) {
    return (
      <View style={[styles.chip, { backgroundColor: colors.surface }]}>
        <Ionicons name="hourglass-outline" size={12} color={colors.textMuted} />
        <Text style={[styles.chipText, { color: colors.textMuted }]}>Pre-screening…</Text>
      </View>
    );
  }
  const d = DECISION[suggestion.decision];
  const t = toneColors(d.tone);
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Ionicons name="bulb" size={12} color={t.fg} />
      <Text style={[styles.chipText, { color: t.fg }]}>AI: {d.label}</Text>
    </View>
  );
}

/** The decision taken, as a badge with icon (approved / changes requested / rejected). */
export function DecisionBadge({ decision }: { decision: ReviewDecision }) {
  const d = DECISION[decision];
  const t = toneColors(d.tone);
  const label = decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Changes requested";
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Ionicons name={d.icon} size={12} color={t.fg} />
      <Text style={[styles.chipText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** One campaign in the review queue. */
export function QueueRow({ c, tab }: { c: AdminCampaignCard; tab: string }) {
  const cat = c.category ? CATEGORY[c.category] : null;
  const when = tab === "pending" ? c.submittedAt : (c.reviewedAt ?? c.submittedAt);
  return (
    <Card
      padded={false}
      accessibilityLabel={c.title ?? "Untitled campaign"}
      onPress={() => router.push({ pathname: "/admin/campaign/[id]", params: { id: c.id } })}
    >
      <View style={styles.rowTop}>
        <CampaignThumb uri={c.squareImageUrl ?? c.coverImageUrl} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          {cat && (
            <View style={styles.row}>
              <Ionicons name={cat.icon} size={12} color={cat.tint} />
              <Text variant="caption" color={cat.tint} style={{ fontFamily: fonts.medium }}>
                {cat.label}
              </Text>
              {c.isResubmission && (
                <View style={[styles.chip, { backgroundColor: colors.blueSoft, paddingVertical: 1 }]}>
                  <Ionicons name="refresh" size={10} color={colors.blue} />
                  <Text style={[styles.chipText, { color: colors.blue, fontSize: 10.5 }]}>Resubmitted</Text>
                </View>
              )}
            </View>
          )}
          <Text variant="title" numberOfLines={2}>
            {c.title || "Untitled campaign"}
          </Text>
          <View style={styles.row}>
            <Avatar name={c.creator.fullName} url={c.creator.avatarUrl} size={18} />
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {c.creatorName || c.creator.fullName}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </View>
      <View style={styles.rowFoot}>
        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
        <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
          {tab === "pending" ? "Submitted" : "Reviewed"} {when ? timeAgo(when) : ""}
          {c.funding.goalCents ? ` · Goal ${money(c.funding.goalCents)}` : ""}
          {tab === "approved" && c.funding.raisedCents ? ` · ${percent(c.funding.percentFunded)} funded` : ""}
        </Text>
        {tab === "pending" ? <SuggestionChip suggestion={c.aiSuggestion} /> : null}
      </View>
    </Card>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    logo: { width: 30, height: 32 },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    segments: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    segmentRow: { flexDirection: "row", padding: 4 },
    thumb: {
      position: "absolute",
      top: 4,
      bottom: 4,
      left: 0,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      shadowColor: "#26264A",
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segment: { flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 5 },
    segmentText: { fontSize: 13, lineHeight: 17, flexShrink: 1 },
    count: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    // Explicit line height + no font padding so the digits sit in the middle of the circle
    countText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13, color: colors.primary, includeFontPadding: false, textAlignVertical: "center", textAlign: "center" },
    chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
    chipText: { fontFamily: fonts.semibold, fontSize: 11.5 },
    rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
    rowFoot: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
  }),
);
