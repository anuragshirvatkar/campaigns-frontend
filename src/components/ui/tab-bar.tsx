import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { IconName } from "@/lib/labels";
import { colors, fonts, themed, dk } from "@/theme";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// Icons per route: [inactive outline, active filled]
const ICONS: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  explore: ["search-outline", "search"],
  activity: ["notifications-outline", "notifications"],
  profile: ["person-outline", "person"],
};

const BAR = themed(() => ({ bg: dk("#F5F5FD", "#17182C"), border: dk("#E6E7F6", "#2A2B46"), inactive: dk("#5F6784", "#9294B4") }));
const FAB = 60;
const GAP = 7; // empty space between the button and the curved notch
const NOTCH = FAB / 2 + GAP;
const BAR_H = 66;
const OVERHANG = FAB / 2; // button half sits above the bar

/** Bar outline: flat top with a smooth round notch cut around the Create button. */
function barPath(w: number, h: number) {
  const c = w / 2;
  const r = NOTCH;
  const s = 16; // how far the curve eases in from the flat edge
  return {
    fill: `M0 0 H${c - r - s} C${c - r + 4} 0 ${c - r} ${r} ${c} ${r} C${c + r} ${r} ${c + r - 4} 0 ${c + r + s} 0 H${w} V${h} H0 Z`,
    edge: `M0 0.5 H${c - r - s} C${c - r + 4} 0.5 ${c - r} ${r + 0.5} ${c} ${r + 0.5} C${c + r} ${r + 0.5} ${c + r - 4} 0.5 ${c + r + s} 0.5 H${w}`,
  };
}

/** Space tab screens leave at the bottom so their last item clears the tab bar */
export function useTabBarSpace() {
  return BAR_H + useSafeAreaInsets().bottom;
}

/** Tab bar attached to the bottom, with the Create button resting in a curved notch (theme references/bottom-nav-bar.png). */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const barH = BAR_H + insets.bottom;
  const path = barPath(width, barH);
  const createIndex = state.routes.findIndex((r) => r.name === "create");

  const pressFor = (index: number) => () => {
    const route = state.routes[index];
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    Haptics.selectionAsync().catch(() => {});
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    // Floats over the screen (box-none): content shows around the raised button, no white strip
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { height: barH + OVERHANG }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={barH} style={styles.svg}>
          <Path d={path.fill} fill={BAR.bg} />
          <Path d={path.edge} stroke={BAR.border} strokeWidth={1} fill="none" />
        </Svg>
      )}
      <View style={[styles.row, { height: BAR_H }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;

          const onPress = pressFor(index);

          if (route.name === "create") {
            return (
              <Pressable key={route.key} accessible={false} onPress={onPress} style={styles.tab}>
                <Text maxFontSizeMultiplier={1}
                  style={[
                    styles.label,
                    { color: focused ? colors.primary : BAR.inactive, fontFamily: focused ? fonts.semibold : fonts.regular },
                  ]}
                >
                  {label}
                </Text>
                <View style={styles.dotSpace} />
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
      {createIndex >= 0 && <CreateButton focused={state.index === createIndex} onPress={pressFor(createIndex)} />}
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
  const dot = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (focused) pop.set(withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, { damping: 9, stiffness: 260 })));
    dot.set(withTiming(focused ? 1 : 0, { duration: 180 }));
  }, [focused, pop, dot]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: dot.value }] }));
  const color = focused ? colors.primary : BAR.inactive;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badge} new` : label}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? icons[1] : icons[0]} size={25} color={color} />
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text maxFontSizeMultiplier={1} style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
      <Text maxFontSizeMultiplier={1} style={[styles.label, { color, fontFamily: focused ? fonts.semibold : fonts.regular }]}>{label}</Text>
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
      <Animated.View style={[styles.fab, fabStyle]}>
        <Ionicons name="add" size={32} color={colors.textOnDark} />
      </Animated.View>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, justifyContent: "flex-end" },
  svg: { position: "absolute", left: 0, bottom: 0 },
  row: { flexDirection: "row", position: "absolute", left: 0, right: 0, top: OVERHANG },
  tab: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 6, minHeight: 48 },
  label: { fontSize: 12, marginTop: 3, includeFontPadding: false },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 4 },
  dotSpace: { height: 9 },
  fabSlot: { position: "absolute", top: 0, alignSelf: "center" },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    backgroundColor: dk("#5B4DF8", "#6E5CFF"),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5B4DF8",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
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
    borderColor: BAR.bg,
  },
  badgeText: { color: colors.textOnDark, fontFamily: fonts.semibold, fontSize: 9.5, includeFontPadding: false },
}));
