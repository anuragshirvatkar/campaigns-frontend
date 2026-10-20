// Screen scaffolding: scroll container, section headers, key/value rows, list rows, dividers.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import {
  LayoutAnimation,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IconName } from "@/lib/labels";
import { colors, radius, spacing, themed, dk } from "@/theme";
import { Text } from "./text";

type ScreenProps = ScrollViewProps & {
  children: ReactNode;
  /** Pull to refresh */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Adds the top safe-area inset (for tab screens without a header) */
  safeTop?: boolean;
  /** Extra bottom padding, e.g. above a sticky action bar */
  bottomInset?: number;
  padded?: boolean;
  background?: ReactNode;
};

export function Screen({
  children,
  onRefresh,
  refreshing = false,
  safeTop,
  bottomInset = 0,
  padded = true,
  background,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      {background}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          padded && styles.padded,
          { paddingTop: (safeTop ? insets.top : 0) + (padded ? spacing.lg : 0), paddingBottom: spacing.huge + bottomInset },
          contentContainerStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          ) : undefined
        }
        {...rest}
      >
        {children}
      </ScrollView>
      {safeTop && <StatusBarShade />}
    </View>
  );
}

/** Solid strip behind the status bar so scrolled content doesn't run under the clock. */
export function StatusBarShade() {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={[styles.shade, { height: insets.top }]} />;
}

export function SectionHeader({ title, action, onAction, overline }: { title: string; action?: string; onAction?: () => void; overline?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {overline && <Text variant="overline">{overline}</Text>}
        <Text variant="h3" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {action && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <Text variant="title" color={colors.primary} style={styles.sectionAction}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function KeyValue({
  label,
  value,
  emphasis,
  hint,
  valueColor,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  hint?: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.kv}>
      <View style={{ flex: 1 }}>
        <Text variant={emphasis ? "title" : "body"} color={emphasis ? colors.text : colors.textMuted}>
          {label}
        </Text>
        {hint && <Text variant="caption">{hint}</Text>}
      </View>
      <Text variant={emphasis ? "h3" : "title"} color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  tint = colors.primary,
  tintBg = colors.primarySoft,
  danger,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  tint?: string;
  tintBg?: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.primaryTint }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerSoft : tintBg }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" color={danger ? colors.danger : colors.text}>
          {title}
        </Text>
        {subtitle && <Text variant="caption">{subtitle}</Text>}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />}
    </Pressable>
  );
}

/** Expandable explanation section ("Use of funds", "How review works"…). */
export function Expandable({
  title,
  icon,
  children,
  initiallyOpen,
  subtitle,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  initiallyOpen?: boolean;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(!!initiallyOpen);
  return (
    <View style={styles.expandable}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        style={styles.expandHeader}
      >
        {icon && (
          <View style={styles.expandIcon}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="title">{title}</Text>
          {subtitle && <Text variant="caption">{subtitle}</Text>}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </Pressable>
      {open && <View style={styles.expandBody}>{children}</View>}
    </View>
  );
}

/** Small info/warning callout. */
export function Note({
  children,
  tone = "info",
  icon,
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "success" | "danger";
  icon?: IconName;
}) {
  const t = {
    info: { fg: colors.primary, bg: colors.primaryTint, icon: "information-circle-outline" as IconName },
    warning: { fg: colors.warning, bg: colors.warningSoft, icon: "warning-outline" as IconName },
    success: { fg: colors.success, bg: colors.successSoft, icon: "checkmark-circle-outline" as IconName },
    danger: { fg: colors.danger, bg: colors.dangerSoft, icon: "alert-circle-outline" as IconName },
  }[tone];
  return (
    <View style={[styles.note, { backgroundColor: t.bg }]}>
      <Ionicons name={icon ?? t.icon} size={18} color={t.fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>{typeof children === "string" ? <Text variant="bodySm" color={colors.text}>{children}</Text> : children}</View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  shade: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: dk("rgba(255,255,255,0.96)", "rgba(15,16,32,0.96)") },
  padded: { paddingHorizontal: spacing.xl },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", marginBottom: spacing.md, gap: spacing.md },
  sectionAction: { fontSize: 14 },
  kv: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, minHeight: 60, borderRadius: radius.md },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  expandable: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: "hidden" },
  expandHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, minHeight: 56 },
  expandIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  expandBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  note: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
}));
