// Compact filter rows: a few pills that always fit on one line, plus "More", which unrolls a white
// mat over the page with the remaining options (used by Explore and Activity).
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed, dk } from "@/theme";

/** Filter pill. Pills hug their label and wrap rather than shrink or cut their text. An optional count sits in a small circle. */
export function Pill({
  label,
  icon,
  count,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  count?: number;
  selected?: boolean;
  onPress: () => void;
}) {
  const fg = selected ? colors.textOnDark : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={6}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.pill, selected ? styles.pillOn : styles.pillOff, pressed && { opacity: 0.75 }]}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? fg : colors.primary} />}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.pillText, { color: fg }]}>
        {label}
      </Text>
      {count ? (
        <View style={[styles.count, selected && styles.countOn]}>
          <Text style={[styles.countText, selected && { color: colors.textOnDark }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function MoreToggle({ open, onPress }: { open: boolean; onPress: () => void }) {
  return <Pill label={open ? "Less" : "More"} icon={open ? "chevron-up" : "chevron-down"} onPress={onPress} />;
}

/** Pills in equal columns, wrapping onto new lines; a short last line uses each label’s own width. */
export function PillGrid({ columns, children }: { columns: number; children: ReactNode[] }) {
  return (
    <View style={{ gap: 8 }}>
      {chunk(children, columns).map((line, i) =>
        line.length === columns ? (
          <View key={i} style={styles.row}>
            {line}
          </View>
        ) : (
          // A short last line sizes each pill to its own label, so nothing is cut off on narrow phones
          <View key={i} style={styles.row}>
            {line.map((child, j) => (
              <View key={j}>{child}</View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}

export type PillSpec = { label: string; icon?: boolean; count?: boolean };

/**
 * How many of `pills` (in order) fit on two screen-wide lines when `more` must end the second line.
 * Mirrors flex-wrap: each pill goes on the current line if it fits, otherwise starts the next one.
 */
export function useTwoLineFit(pills: PillSpec[], more: PillSpec) {
  // A little slack, since pill widths are estimates
  const available = useWindowDimensions().width - spacing.xl * 2 - 12;
  const fits = (n: number) => {
    let line = 1;
    let used = 0;
    for (const p of [...pills.slice(0, n), more]) {
      const w = pillWidth(p);
      if (used && used + spacing.sm + w > available) {
        line++;
        used = w;
      } else used += (used ? spacing.sm : 0) + w;
    }
    return line <= 2;
  };
  let n = 0;
  while (n < pills.length && fits(n + 1)) n++;
  return n;
}

/** Rough on-screen width of a pill at its fixed size (13px Rubik medium, 12px padding). */
function pillWidth(p: PillSpec) {
  return 26 + p.label.length * 6.8 + (p.icon ? 21 : 0) + (p.count ? 24 : 0);
}

/**
 * True when these pills would NOT fit on one line of a screen-wide row (20px page margins).
 * Filter rows then show one pill fewer up front, so the row and More always stay on one line.
 */
export function useNarrowFilters(pills: PillSpec[]) {
  const available = useWindowDimensions().width - spacing.xl * 2;
  const needed = pills.reduce((sum, p) => sum + pillWidth(p), 0) + (pills.length - 1) * spacing.sm;
  return needed > available;
}

/** One line of pills. */
export function PillRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function chunk<T>(list: T[], n: number): T[][] {
  const rows: T[][] = [];
  list.forEach((x, i) => (i % n ? rows[rows.length - 1].push(x) : rows.push([x])));
  return rows;
}

export type Anchor = { top: number; height: number };
const PAD = 10; // mat padding around the copied row

/**
 * Which mat is open and where. Put rootRef on the screen's outer view and each row's ref on the
 * view wrapping that row; render <FilterMat> as the last child of the root.
 */
export function useFilterMenu<M extends string>(rowRefs: Record<M, RefObject<View | null>>) {
  const rootRef = useRef<View>(null);
  const [menu, setMenu] = useState<M | null>(null);
  const [shownMenu, setShownMenu] = useState<M | null>(null); // stays set while the mat rolls up
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const close = () => {
    setMenu(null);
    setTimeout(() => setShownMenu(null), 210);
  };
  const toggle = (m: M) => {
    if (menu === m) return close();
    rowRefs[m].current?.measureInWindow((_x, y, _w, h) =>
      rootRef.current?.measureInWindow((_rx, ry) => {
        setAnchor({ top: y - ry, height: h });
        setMenu(m);
        setShownMenu(m);
      }),
    );
  };
  return { rootRef, menu, shownMenu, anchor, toggle, close };
}

/**
 * White mat that floats over the page and unrolls downward from a filter row. It starts exactly
 * over the row (drawing its own copy of it), so row and options read as one continuous surface.
 */
export function FilterMat({
  open,
  anchor,
  row,
  children,
  onClose,
}: {
  open: boolean;
  anchor: Anchor;
  row: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const [contentH, setContentH] = useState(0);
  const p = useSharedValue(0);
  const closedH = anchor.height + PAD * 2;
  useEffect(() => {
    p.set(withTiming(open ? 1 : 0, { duration: open ? 320 : 200, easing: Easing.out(Easing.cubic) }));
  }, [open, p]);
  const matStyle = useAnimatedStyle(() => ({ height: closedH + p.value * Math.max(0, contentH - closedH) }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: p.value }));

  return (
    <>
      <Pressable accessibilityLabel="Close options" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[styles.matShadow, { top: anchor.top - PAD + 5 }, matStyle, shadeStyle]} />
      <Animated.View style={[styles.mat, { top: anchor.top - PAD }, matStyle]}>
        <View style={styles.matInner} onLayout={(e) => setContentH(e.nativeEvent.layout.height)}>
          {row}
          <View style={{ gap: 8, marginTop: 8 }}>{children}</View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  // Pills keep their natural width; what doesn’t fit wraps to the next line
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  // Same size as the small chips in Create (category, creator type): hugs its label, 32 high
  pill: {
    flexShrink: 0,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  // A touch more visible than the hairline border, still quiet
  pillOff: { backgroundColor: colors.surface, borderColor: dk("#DEDCF0", "#34355A") },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countOn: { backgroundColor: "rgba(255,255,255,0.25)" },
  countText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary, includeFontPadding: false },
  pillText: { fontFamily: fonts.medium, fontSize: 13 },
  mat: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  // Soft edge under the mat only (an elevation shadow would also draw a line along its top)
  matShadow: {
    position: "absolute",
    left: 6,
    right: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: dk("rgba(75, 68, 168, 0.10)", "rgba(0, 0, 0, 0.35)"),
  },
  matInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: PAD,
    paddingBottom: spacing.lg,
  },
}));
