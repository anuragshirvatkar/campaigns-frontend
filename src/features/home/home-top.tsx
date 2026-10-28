import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useBacked } from "@/api/queries";
import type { CampaignCard as Campaign } from "@/api/types";
import { Avatar, StatusPill, Text } from "@/components/ui";
import { openCampaign } from "@/features/campaigns/campaign-card";
import { compactNumber, money } from "@/lib/format";
import { CATEGORY, type IconName } from "@/lib/labels";
import { fonts, themed, dk, colors } from "@/theme";
import { PressScale } from "@/components/ui/motion";

// Home is laid out in the pixels of theme references/Reach App Campaign Dashboard.png
// (669px wide as measured) and scaled to the device width.
const REF_W = 669;
export type Scale = (v: number) => number;
export function useHomeScale(): Scale {
  const { width } = useWindowDimensions();
  return (v: number) => (v * width) / REF_W;
}

// Colours sampled from the reference
export const H = themed(() => ({
  ink: dk("#111A48", "#ECECF8"),
  body: dk("#5A5F86", "#A3A4C2"),
  panel: dk("#F5F4FD", "#1B1A36"),
  border: dk("#EDEEFB", "#2C2D4A"),
  accent: dk("#6847FD", "#7B68FF"),
  accentPressed: dk("#5636E6", "#6A56F0"),
  track: dk("#E8E7FD", "#2C2A55"),
  outline: dk("#D9D2FE", "#4A4290"),
}));

const IMG = {
  logo: require("../../../assets/images/logo.png"),
  megaphone: require("../../../assets/images/home/megaphone.png"),
};

const enter = (delay: number) => FadeInDown.duration(450).delay(delay);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const spring = { damping: 18, stiffness: 320, mass: 0.6 };

/** Logo + name, notifications bell and the profile avatar. */
export function HomeHeader({
  u,
  hasUnread,
  user,
  title = "Campaigns",
  showBell = true,
}: {
  u: Scale;
  title?: string;
  /** Off on Activity itself, where the bell would only link to the current screen */
  showBell?: boolean;
  hasUnread: boolean;
  user: { fullName: string; avatarUrl: string | null } | null;
}) {
  return (
    <View style={[styles.row, { height: u(120), paddingHorizontal: u(11) }]}>
      <View style={[styles.row, { flex: 1, gap: u(18) }]}>
        <Image
          source={IMG.logo}
          accessibilityIgnoresInvertColors
          style={{ width: u(50), height: u(50) * (270 / 256) }}
          contentFit="contain"
        />
        <Text maxFontSizeMultiplier={1} style={[styles.brand, { fontSize: u(38) }]}>{title}</Text>
      </View>
      {showBell && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasUnread ? "Activity, new updates" : "Activity"}
        hitSlop={10}
        onPress={() => router.navigate("/activity")}
        style={[styles.center, { width: u(64), height: u(64), marginRight: u(28) }]}
      >
        <Ionicons name="notifications-outline" size={u(40)} color={H.ink} />
        {hasUnread && <View style={[styles.unread, { top: u(10), right: u(14) }]} />}
      </Pressable>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.navigate("/profile")}>
        {user ? (
          <Avatar name={user.fullName} url={user.avatarUrl} size={u(66)} color={H.accent} />
        ) : (
          <View style={[styles.center, styles.guest, { width: u(78), height: u(78), borderRadius: u(39) }]}>
            <Ionicons name="person-outline" size={u(30)} color={H.accent} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

/** Lavender panel: globe top-right, headline and pitch on the left, the two main actions. */
export function HomeHero({ u }: { u: Scale }) {
  const reduceMotion = useReducedMotion();
  const tilt = useSharedValue(0);
  const w = u(625); // panel width (669 minus the 22px side margins)
  const h = u(470);

  // One-second intro: the megaphone kicks back, then rests
  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    tilt.set(withSequence(withTiming(-7, { duration: 180 }), withSpring(0, { damping: 6, stiffness: 180 })));
  }, [reduceMotion, tilt]);

  const megaphoneStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));

  return (
    <Animated.View entering={enter(0)} style={{ height: h, borderRadius: u(30), overflow: "hidden" }}>
      {/* Lavender, turning white over the top 30% */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="heroFade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={H.panel} />
            <Stop offset="0.7" stopColor={H.panel} />
            <Stop offset="1" stopColor={colors.background} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={h} fill="url(#heroFade)" />
      </Svg>

      <Text maxFontSizeMultiplier={1}
        accessibilityRole="header"
        style={[styles.abs, styles.title, { left: u(28), top: u(38), fontSize: u(50), lineHeight: u(54), letterSpacing: u(-0.8) }]}
      >
        {"Make Your\nVoice Reach\n"}
        {/* Same headline style spelled out: nested <Text> would otherwise take the body variant */}
        <Text maxFontSizeMultiplier={1} style={[styles.title, { color: H.accent, fontSize: u(50), lineHeight: u(54), letterSpacing: u(-0.8) }]}>
          Further.
        </Text>
      </Text>
      <Animated.View
        style={[
          styles.abs,
          { left: u(408), top: u(30), width: u(190), height: u(190) * (487 / 600), transformOrigin: "20% 80%" },
          megaphoneStyle,
        ]}
      >
        <Image source={IMG.megaphone} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>

      <Text maxFontSizeMultiplier={1} style={[styles.abs, styles.body, { left: u(28), top: u(222), fontSize: u(24), lineHeight: u(34) }]}>
        {"Community-funded reach to help ideas,\ncauses and stories reach beyond\nyour network."}
      </Text>
      <View style={[styles.abs, styles.row, { left: u(17), right: u(17), top: u(370), height: u(78), gap: u(20) }]}>
        <HeroButton u={u} filled icon="search" label="Explore Campaigns" onPress={() => router.navigate("/explore")} />
        <HeroButton u={u} icon="add" label="Start a Campaign" onPress={() => router.navigate("/create")} />
      </View>
    </Animated.View>
  );
}

function HeroButton({
  u,
  label,
  icon,
  filled,
  onPress,
}: {
  u: Scale;
  label: string;
  icon: IconName;
  filled?: boolean;
  onPress: () => void;
}) {
  const p = useSharedValue(0);
  // Plain values for the worklet (H is a theme proxy, which can't cross to the UI thread)
  const [bg, bgPressed] = filled ? [H.accent, H.accentPressed] : [colors.card, colors.primaryTint];
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.04 * p.value }],
    backgroundColor: interpolateColor(p.value, [0, 1], [bg, bgPressed]),
  }));
  const fg = filled ? "#FFFFFF" : H.accent;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => p.set(withSpring(1, spring))}
      onPressOut={() => p.set(withSpring(0, spring))}
      onPress={onPress}
      style={[
        styles.row,
        styles.center,
        { flex: 1, height: "100%", borderRadius: u(14), gap: u(14) },
        !filled && { borderWidth: 1.5, borderColor: H.outline },
        style,
      ]}
    >
      <Ionicons name={icon} size={u(34)} color={fg} />
      <Text maxFontSizeMultiplier={1} style={[styles.btnText, { color: fg, fontSize: u(20.5) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/** Featured campaign card: photo on the left; category, title, creator, funding, reach and Back This. */
export function CampaignTile({ u, campaign: c }: { u: Scale; campaign: Campaign }) {
  const backed = useBacked().data?.some((b) => b.id === c.id) ?? false;
  const cat = c.category ? CATEGORY[c.category] : null;
  const reach = c.funding.estimatedReachAtGoal;
  const id = c.slug ?? c.id;
  const pct = Math.max(0, Math.min(100, c.funding.percentFunded));

  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={c.title ?? "Campaign"}
      onPress={() => openCampaign(c)}
      style={({ pressed }) => [styles.tile, { borderRadius: u(22), padding: u(17), gap: u(28) }, pressed && { opacity: 0.94 }]}
    >
      <Image
        source={c.squareImageUrl || c.coverImageUrl ? { uri: (c.squareImageUrl ?? c.coverImageUrl)! } : null}
        style={{ width: u(222), height: u(248), borderRadius: u(16), backgroundColor: H.panel }}
        contentFit="cover"
        transition={200}
      />
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <View>
          {cat && (
            <View
              style={[
                styles.row,
                styles.chip,
                { backgroundColor: cat.bg, height: u(34), paddingHorizontal: u(12), gap: u(8), borderRadius: u(17) },
              ]}
            >
              <Ionicons name={cat.icon} size={u(18)} color={cat.tint} />
              <Text maxFontSizeMultiplier={1} style={[styles.chipText, { fontSize: u(15), lineHeight: u(18), color: cat.tint }]}>{cat.label}</Text>
            </View>
          )}
          <Text maxFontSizeMultiplier={1} style={[styles.tileTitle, { fontSize: u(23), lineHeight: u(29), marginTop: u(10) }]} numberOfLines={2}>
            {c.title}
          </Text>
        </View>
        <View>
          <View style={{ height: u(12), borderRadius: u(6), backgroundColor: H.track, overflow: "hidden" }}>
            <View style={{ width: `${pct}%`, height: "100%", borderRadius: u(6), backgroundColor: H.accent }} />
          </View>
          <View style={[styles.row, { justifyContent: "space-between", marginTop: u(8) }]}>
            <Text maxFontSizeMultiplier={1} style={[styles.tileMoney, { fontSize: u(18.5) }]}>
              {money(c.funding.raisedCents)} <Text maxFontSizeMultiplier={1} style={[styles.body, { fontSize: u(18.5) }]}>raised</Text>
            </Text>
            <Text maxFontSizeMultiplier={1} style={[styles.body, { fontSize: u(18.5) }]}>{money(c.funding.goalCents)}</Text>
          </View>
          <View style={[styles.row, { justifyContent: "space-between", marginTop: u(10) }]}>
            <View style={[styles.row, { gap: u(10) }]}>
              <Ionicons name="person-outline" size={u(24)} color={H.body} />
              <Text maxFontSizeMultiplier={1} style={[styles.tileReach, { fontSize: u(18.5) }]}>{reach ? `~ ${compactNumber(reach.high)} people` : "—"}</Text>
            </View>
            {c.status === "funding" && backed ? (
              // Already backed: say so instead of asking again (backing again still works from the campaign page)
              <View
                accessibilityLabel="You backed this"
                style={[styles.row, styles.center, { height: u(48), paddingHorizontal: u(16), gap: u(6), borderRadius: u(10), backgroundColor: H.panel }]}
              >
                <Ionicons name="checkmark-circle" size={u(22)} color={H.accent} />
                <Text maxFontSizeMultiplier={1} style={[styles.btnText, { color: H.accent, fontSize: u(19) }]}>Backed</Text>
              </View>
            ) : c.status === "funding" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Back ${c.title}`}
                hitSlop={8}
                onPress={() => router.push({ pathname: "/campaign/[id]/back", params: { id } })}
                style={({ pressed }) => [
                  styles.center,
                  { width: u(132), height: u(48), borderRadius: u(10), backgroundColor: pressed ? H.accentPressed : H.accent },
                ]}
              >
                <Text maxFontSizeMultiplier={1} style={[styles.btnText, { color: "#FFFFFF", fontSize: u(19) }]}>Back This</Text>
              </Pressable>
            ) : (
              <StatusPill status={c.status} />
            )}
          </View>
        </View>
      </View>
    </PressScale>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  abs: { position: "absolute" },
  brand: { fontFamily: fonts.bold, color: H.ink, letterSpacing: -0.3 },
  unread: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#F88A7E",
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  guest: { backgroundColor: colors.primarySoft },
  panel: { backgroundColor: H.panel, overflow: "hidden" },
  title: { fontFamily: fonts.bold, color: H.ink, includeFontPadding: false },
  body: { fontFamily: fonts.regular, color: H.body, includeFontPadding: false },
  btnText: { fontFamily: fonts.medium, includeFontPadding: false },
  note: { textAlign: "center", color: colors.textMuted },
  tile: { flexDirection: "row", backgroundColor: colors.card, borderWidth: 1, borderColor: H.border },
  chip: { alignSelf: "flex-start" },
  // Line height = icon size and no font padding, so label and icon share one centre line
  chipText: { fontFamily: fonts.medium, includeFontPadding: false, textAlignVertical: "center" },
  tileTitle: { fontFamily: fonts.semibold, color: H.ink, includeFontPadding: false },
  tileMoney: { fontFamily: fonts.medium, color: H.ink, includeFontPadding: false },
  tileReach: { fontFamily: fonts.regular, color: H.ink, includeFontPadding: false },
}));
