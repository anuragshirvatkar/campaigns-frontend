// Small shared pieces for the campaign, back, report and comments screens, so they read as one set:
// a muted section label (as on Profile and Create), white cards with soft shadows, and rows inside them.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Children, useState, type ReactNode } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Card, ProgressBar, Text } from "@/components/ui";
import { money, percent } from "@/lib/format";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed } from "@/theme";
import { PressScale } from "@/components/ui/motion";

/** Muted uppercase label that opens a section, with an optional link on the right. */
export function SectionLabel({
  children,
  action,
  onAction,
  style,
}: {
  children: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.label, style]}>
      <Text variant="overline" color={colors.textMuted} accessibilityRole="header">
        {children}
      </Text>
      {action && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <Text variant="title" color={colors.primary} style={{ fontSize: 14 }}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** White card whose children are separated by hairlines. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = Children.toArray(children);
  return (
    <Card padded={false} style={[{ overflow: "hidden" }, style]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={styles.hairline} />}
          {child}
        </View>
      ))}
    </Card>
  );
}

/** Row inside a Group that opens to show more. */
export function AccordionRow({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <PressScale scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryTint }]}
      >
        <View style={styles.well}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text variant="title" style={{ flex: 1 }}>
          {title}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </PressScale>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

/** Tappable row inside a Group: icon, title, optional detail, chevron. */
export function LinkRow({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryTint }]}
    >
      <View style={styles.well}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressScale>
  );
}

/** Label on the left, value on the right; used for money breakdowns. */
export function ValueRow({
  label,
  value,
  hint,
  strong,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.valueRow}>
      <View style={{ flex: 1 }}>
        <Text variant={strong ? "title" : "body"}>{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <Text
        variant="title"
        color={accent ? colors.primary : colors.text}
        style={strong ? { fontSize: 18, fontFamily: fonts.semibold } : null}
      >
        {value}
      </Text>
    </View>
  );
}

const PLACEHOLDER = require("../../../assets/images/create/draft-placeholder.png");

/** Campaign image, or (for drafts without one) the globe-and-megaphone illustration on a soft violet glow. */
export function CampaignThumb({
  uri,
  size = 72,
  style,
}: {
  uri: string | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.thumbBox, { width: size, height: size }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <>
          <View style={[styles.glow, { width: size * 0.78, height: size * 0.78, borderRadius: size }]} />
          <Image source={PLACEHOLDER} style={{ width: size * 0.86, height: size * 0.7 }} contentFit="contain" />
        </>
      )}
    </View>
  );
}

/**
 * One campaign in a list (My campaigns, Backed, Following): image, status, title, a progress line,
 * and one line of detail. Drafts show how far through the five steps they are.
 */
export function CampaignListCard({
  title,
  imageUrl,
  badge,
  progress,
  progressLabel,
  progressValue,
  detail,
  footer,
  onPress,
}: {
  title: string | null;
  imageUrl: string | null | undefined;
  badge?: ReactNode;
  progress: number;
  progressLabel: string;
  progressValue?: string;
  detail?: string;
  /** Replaces the default footer (detail text + badge) */
  footer?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} padded={false} accessibilityLabel={title ?? "Untitled campaign"}>
      <View style={styles.listTop}>
        <CampaignThumb uri={imageUrl} size={76} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="title" numberOfLines={2}>
            {title || "Untitled draft"}
          </Text>
          <ProgressBar value={progress} height={5} />
          <View style={styles.listMeta}>
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {progressLabel}
            </Text>
            {progressValue ? (
              <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
                {progressValue}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {/* Footer: one line of detail on the left, status on the right */}
      {footer ? (
        <View style={[styles.listFoot, { paddingVertical: spacing.xs }]}>{footer}</View>
      ) : (
        (detail || badge) && (
          <View style={styles.listFoot}>
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {detail}
            </Text>
            {badge}
          </View>
        )
      )}
    </Card>
  );
}

/** Compact campaign row: image, title, funding bar. Shown at the top of the back flow. */
export function CampaignSummary({
  title,
  imageUrl,
  raisedCents,
  goalCents,
  percentFunded,
}: {
  title: string | null;
  imageUrl: string | null;
  raisedCents: number;
  goalCents: number | null;
  percentFunded: number;
}) {
  return (
    <Card style={styles.summary}>
      <Image source={imageUrl ? { uri: imageUrl } : null} style={styles.thumb} contentFit="cover" />
      <View style={{ flex: 1, gap: 6 }}>
        <Text variant="title" numberOfLines={2}>
          {title}
        </Text>
        <ProgressBar value={percentFunded} height={6} />
        <Text variant="caption">
          {money(raisedCents)} of {money(goalCents)} · {percent(percentFunded)}
        </Text>
      </View>
    </Card>
  );
}

export const campaignStyles = themed(() => StyleSheet.create({
  section: { marginTop: spacing.xxxl },
}));

const styles = themed(() => StyleSheet.create({
  label: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    paddingVertical: spacing.md,
  },
  well: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  valueRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  thumbBox: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: { position: "absolute", backgroundColor: colors.primarySoft },
  listTop: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "flex-start" },
  listFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySoft },
}));
