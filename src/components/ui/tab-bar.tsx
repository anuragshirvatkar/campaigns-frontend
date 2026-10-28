import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { BlurTargetView, BlurView } from "expo-blur";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { IconName } from "@/lib/labels";
import { colors, fonts, themed, dk, isDark } from "@/theme";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// Icons per route: [inactive outline, active filled]
const ICONS: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  explore: ["search-outline", "search"],
  activity: ["notifications-outline", "notifications"],
  profile: ["person-outline", "person"],
  // Admin app
  review: ["file-tray-full-outline", "file-tray-full"],
  analytics: ["stats-chart-outline", "stats-chart"],
  account: ["person-circle-outline", "person-circle"],
};

// Frosted glass (theme references/Pastel Glassmorphism Mobile Navigation Bar.png): a translucent
// milky panel with a bright rim and a faint violet wash, floating above the content.
const GLASS = themed(() => ({
  // See-through: the page shows faintly behind the bar
  // Over the blur: a light milky tint, so the blurred page still shows through
  // Gradient stops take a solid colour plus stopOpacity (react-native-svg ignores rgba alpha in stops)
  top: dk("#FFFFFF", "#282946"),
  topA: dk(0.45, 0.5),
  bottom: dk("#EEEBFF", "#1A1B30"),
  bottomA: dk(0.6, 0.65),
  // Light catching the top half of the glass
  sheen: "#FFFFFF",
  sheenA: dk(0.6, 0.08),
  rim: dk("rgba(255,255,255,1)", "rgba(255,255,255,0.22)"),
  edge: dk("rgba(108,93,232,0.22)", "rgba(125,108,250,0.35)"),
  chip: dk("rgba(255,255,255,0.75)", "rgba(255,255,255,0.08)"),
  chipEdge: dk("rgba(108,93,232,0.12)", "rgba(255,255,255,0.12)"),
  inactive: dk("#5F6784", "#9294B4"),
}));
const FAB = 60;
const RING = 7; // glass ring around the Create button
const NOTCH = FAB / 2 + RING + 4; // curve cut into the bar around the button
const BAR_H = 68;
const RADIUS = 28;
const SIDE = 12; // the bar floats in from the screen edges
const LIFT = 8; // and above the bottom edge
const OVERHANG = FAB / 2 + RING - 6; // how far the button rises above the bar

/** Bar outline: rounded ends, with a smooth notch around the Create button when there is one. */
function barPath(w: number, h: number, notch: boolean) {
  const R = RADIUS;
  const ends = `H${w - R} A${R} ${R} 0 0 1 ${w} ${R} V${h - R} A${R} ${R} 0 0 1 ${w - R} ${h} H${R} A${R} ${R} 0 0 1 0 ${h - R} V${R} A${R} ${R} 0 0 1 ${R} 0 Z`;
  if (!notch) return `M${R} 0 ` + ends;
  const c = w / 2;
  const r = NOTCH;
  const d = r * 0.78; // depth of the dip
  const s = 18; // how far the curve eases in from the flat edge
  return `M${R} 0 H${c - r - s} C${c - r + 2} 0 ${c - r} ${d} ${c} ${d} C${c + r} ${d} ${c + r - 2} 0 ${c + r + s} 0 ` + ends;
}

// ─── Real blur behind the bar ─────────────────────────────────────────────────
// On Android the blur samples a "target" view, so every tab screen is wrapped in one (via the
// navigator's screenLayout) and the bar blurs the target of whichever tab is showing.

const targets = new Map<string, RefObject<View | null>>();
const shown = { key: "" };

/** The blur target of the tab on screen (Sam blurs it while listening). */
export const activeBlurTarget = () => targets.get(shown.key);

/** Wraps one tab screen so the tab bar can blur what's behind it. Use as the Tabs screenLayout. */
export function BlurScreen({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    targets.set(routeKey, ref);
    return () => {
      targets.delete(routeKey);
    };
  }, [routeKey]);
  return (
    <BlurTargetView ref={ref} style={{ flex: 1 }} collapsable={false}>
      {children}
    </BlurTargetView>
  );
}

/** Space tab screens leave at the bottom so their last item clears the floating bar */
export function useTabBarSpace() {
  return BAR_H + LIFT + useSafeAreaInsets().bottom;
}

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const createIndex = state.routes.findIndex((r) => r.name === "create");
  const hasFab = createIndex >= 0;
  const bottom = insets.bottom + LIFT;
  const shownKey = state.routes[state.index]?.key ?? "";
  useEffect(() => {
    shown.key = shownKey;
  }, [shownKey]);
  // Screens register their blur target after the first render; look again once mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const target = mounted ? targets.get(shownKey) : undefined;

  const pressFor = (index: number) => () => {
    const route = state.routes[index];
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    Haptics.selectionAsync().catch(() => {});
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    // Floats over the screen (box-none): content shows around the bar and the raised button
    <View pointerEvents="box-none" style={[styles.wrap, { bottom, height: BAR_H + (hasFab ? OVERHANG : 0) }]}>
      <View style={[styles.bar, { height: BAR_H }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* Thick frosted glass: what's behind shows through, blurred. Re-keyed per tab so it samples the right screen */}
        <View style={[StyleSheet.absoluteFill, styles.blurClip]}>
          {target && (
            <BlurView
              key={shownKey}
              blurTarget={target}
              blurMethod="dimezisBlurViewSdk31Plus"
              intensity={60}
              tint={isDark() ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
        {width > 0 && (
          <Svg width={width} height={BAR_H} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={GLASS.top} stopOpacity={GLASS.topA} />
                <Stop offset="1" stopColor={GLASS.bottom} stopOpacity={GLASS.bottomA} />
              </LinearGradient>
              <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={GLASS.sheen} stopOpacity={GLASS.sheenA} />
                <Stop offset="0.45" stopColor={GLASS.sheen} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="tint" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#B9A8FF" stopOpacity={0.18} />
                <Stop offset="0.5" stopColor="#B9A8FF" stopOpacity={0} />
                <Stop offset="1" stopColor="#B9A8FF" stopOpacity={0.18} />
              </LinearGradient>
            </Defs>
            <Path d={barPath(width, BAR_H, false)} fill="url(#glass)" stroke={GLASS.edge} strokeWidth={1} />
            {/* Pastel violet at the ends and a white sheen on top, like frosted glass */}
            <Path d={barPath(width, BAR_H, false)} fill="url(#tint)" />
            <Path d={barPath(width, BAR_H, false)} fill="url(#sheen)" />
            {/* Bright rim along the top edge, like light catching glass */}
            <Path d={barPath(width - 2, BAR_H - 2, false)} transform="translate(1 1)" fill="none" stroke={GLASS.rim} strokeWidth={1.2} />
          </Svg>
        )}
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = typeof options.title === "string" ? options.title : route.name;
            const onPress = pressFor(index);

            if (route.name === "create") {
              return (
                <Pressable key={route.key} accessible={false} onPress={onPress} style={styles.tab}>
                  <View style={styles.fabSpace} />
                  <Text
                    maxFontSizeMultiplier={1}
                    style={[styles.label, { color: focused ? colors.primary : GLASS.inactive, fontFamily: focused ? fonts.semibold : fonts.medium }]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            }
            return (
              <Tab
                key={route.key}
                label={label}
                icons={ICONS[route.name] ?? ["ellipse-outline", "ellipse"]}
                focused={focused}
                badge={options.tabBarBadge}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
      {hasFab && <CreateButton focused={state.index === createIndex} onPress={pressFor(createIndex)} />}
    </View>
  );
}

function Tab({
  label,
  icons,
  focused,
  badge,
  onPress,
}: {
  label: string;
  icons: [IconName, IconName];
  focused: boolean;
  badge?: string | number;
  onPress: () => void;
}) {
  const pop = useSharedValue(1);
  const on = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (focused) pop.set(withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, { damping: 9, stiffness: 260 })));
    on.set(withTiming(focused ? 1 : 0, { duration: 200 }));
  }, [focused, pop, on]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: on.value }] }));
  const color = focused ? colors.primary : GLASS.inactive;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? icons[1] : icons[0]} size={24} color={color} />
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text maxFontSizeMultiplier={1} style={styles.badgeText}>
              {badge}
            </Text>
          </View>
        )}
      </Animated.View>
      <Text maxFontSizeMultiplier={1} style={[styles.label, { color, fontFamily: focused ? fonts.semibold : fonts.medium }]}>
        {label}
      </Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
}

function CreateButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const press = useSharedValue(0);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.08 * press.value }, { rotate: `${90 * press.value}deg` }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel="Create a campaign"
      accessibilityState={{ selected: focused }}
      onPressIn={() => press.set(withSpring(1, { damping: 15, stiffness: 300 }))}
      onPressOut={() => press.set(withSpring(0, { damping: 12, stiffness: 220 }))}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      hitSlop={6}
      style={styles.fabSlot}
    >
      {/* Glass ring, then the violet button with a lighter top */}
      <View style={styles.ring}>
        <Animated.View style={[styles.fab, fabStyle]}>
          <Svg width={FAB} height={FAB} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="fab" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={dk("#8F7CFF", "#9584FF")} />
                <Stop offset="1" stopColor={dk("#5B4DF8", "#6E5CFF")} />
              </LinearGradient>
            </Defs>
            <Path d={`M${FAB / 2} 0 A${FAB / 2} ${FAB / 2} 0 1 1 ${FAB / 2 - 0.01} 0 Z`} fill="url(#fab)" />
          </Svg>
          <Ionicons name="add" size={32} color={colors.textOnDark} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { position: "absolute", left: SIDE, right: SIDE, justifyContent: "flex-end" },
    bar: {
      borderRadius: RADIUS,
      // Soft violet glow under the glass
      shadowColor: "#6C5DE8",
      shadowOpacity: dk(0.14, 0.3),
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
    },
    blurClip: { borderRadius: RADIUS, overflow: "hidden" },
    row: { flex: 1, flexDirection: "row", paddingHorizontal: 6 },
    tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 4 },
    label: { fontSize: 11.5, marginTop: 2, includeFontPadding: false },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
    fabSpace: { height: 26 },
    fabSlot: { position: "absolute", top: 0, alignSelf: "center" },
    ring: {
      width: FAB + RING * 2,
      height: FAB + RING * 2,
      borderRadius: FAB / 2 + RING,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: dk("rgba(255,255,255,0.55)", "rgba(40,41,70,0.6)"),
      borderWidth: 1,
      borderColor: GLASS.rim,
      shadowColor: "#5B4DF8",
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fab: { width: FAB, height: FAB, borderRadius: FAB / 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    badge: {
      position: "absolute",
      top: -4,
      right: -9,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: colors.coral,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: GLASS.bottom,
    },
    badgeText: { color: colors.textOnDark, fontFamily: fonts.semibold, fontSize: 9.5, includeFontPadding: false },
  }),
);
