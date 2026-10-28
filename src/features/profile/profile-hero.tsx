import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Text } from "@/components/ui";
import { colors, fonts, themed, dk } from "@/theme";

// Layout follows theme references/profile-screen-reference.png: 851px wide, status bar ~70px tall.
const REF_W = 851;
const REF_TOP = 70;
const HERO_H = 765; // where the lavender ends, in reference px

const SKY = themed(() => ({ top: dk("#D3CCF9", "#2B2563"), mid: dk("#E2DDFB", "#221E4D"), bottom: dk("#F0EEFD", "#191934") }));
/** What the top of the header renders as (sky under the 16% white swell); used for the strip behind the status bar. */
export const heroTop = () => dk("#DAD4FA", "#2F2968");

// Sparkle dots scattered over the lavender (reference px)
const DOTS: [number, number, number][] = [
  [326, 26, 4],
  [543, 54, 3.5],
  [55, 148, 4],
  [291, 146, 3.5],
  [450, 175, 3.5],
  [518, 211, 4],
  [669, 142, 3],
  [91, 243, 4],
  [262, 218, 3],
  [438, 261, 3],
  [791, 254, 4],
  [836, 343, 3.5],
  [37, 421, 4],
  [329, 462, 3.5],
  [486, 423, 3],
  [650, 432, 4],
  [544, 472, 3],
  [783, 465, 3],
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

type Stat = { value: string; label: string; onPress: () => void };

/** Lavender header: settings gear, centred haloed avatar with name and email below, and the impact card overlapping its bottom edge. */
export function ProfileHero({
  name,
  email,
  avatarUrl,
  stats,
  showSettings = true,
}: {
  name: string;
  email: string;
  avatarUrl: string | null | undefined;
  stats: Stat[];
  /** The gear to Account settings (the admin has no settings screen) */
  showSettings?: boolean;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const u = (px: number) => (px * width) / REF_W;
  // Reference y (below its status bar) → screen y below the real status bar
  const y = (px: number) => insets.top + u(px - REF_TOP);
  const height = y(HERO_H);
  const avatar = { cx: REF_W / 2, cy: 250, r: 79, halo: 111 };
  // Positions relative to the avatar centre (reference px)
  const ax = (dx: number) => u(avatar.cx + dx);
  const ay = (dy: number) => y(avatar.cy + dy);
  // Keep sparkle dots off the avatar and the name under it
  const dots = DOTS.filter(([dx, dy]) => Math.hypot(dx - avatar.cx, dy + REF_TOP - avatar.cy) > avatar.halo + 30 && !(dy + REF_TOP > 360 && Math.abs(dx - avatar.cx) < 260));

  return (
    <View style={{ height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={SKY.top} />
            <Stop offset="0.55" stopColor={SKY.mid} />
            <Stop offset="1" stopColor={SKY.bottom} />
          </LinearGradient>
          <LinearGradient id="avatar" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8576F7" />
            <Stop offset="1" stopColor="#5A44E6" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sky)" />
        {/* Soft lighter swells, top and lower right */}
        <Path
          d={`M0 ${y(150)} C ${u(180)} ${y(90)} ${u(300)} ${y(170)} ${u(450)} ${y(140)} C ${u(600)} ${y(110)} ${u(700)} ${y(60)} ${width} ${y(90)} V0 H0 Z`}
          fill="#FFFFFF"
          opacity={dk(0.16, 0.05)}
        />
        <Path
          d={`M${u(420)} ${y(520)} C ${u(560)} ${y(470)} ${u(660)} ${y(420)} ${width} ${y(350)} V ${y(560)} H ${u(420)} Z`}
          fill="#FFFFFF"
          opacity={dk(0.18, 0)}
        />
        {dots.map(([dx, dy, r]) => (
          <Circle key={`${dx}-${dy}`} cx={u(dx)} cy={y(dy + REF_TOP)} r={u(r)} fill="#FFFFFF" opacity={dk(0.85, 0.4)} />
        ))}
        {/* Halo, its two accent strokes and the little coloured dots around the avatar */}
        <Circle cx={u(avatar.cx)} cy={y(avatar.cy)} r={u(avatar.halo)} fill="#FFFFFF" opacity={dk(0.35, 0.1)} />
        <Path
          d={`M${ax(76)} ${ay(-106)} L${ax(85)} ${ay(-124)} M${ax(99)} ${ay(-85)} L${ax(118)} ${ay(-95)}`}
          stroke={colors.primary}
          strokeWidth={u(6)}
          strokeLinecap="round"
        />
        <Circle cx={ax(-128)} cy={ay(-50)} r={u(12)} fill="#F6B7A9" />
        <Circle cx={ax(88)} cy={ay(75)} r={u(11)} fill="#7FD9F0" />
        {!avatarUrl && <Circle cx={u(avatar.cx)} cy={y(avatar.cy)} r={u(avatar.r)} fill="url(#avatar)" />}
        {/* White ground the content sits on, with a gentle wave */}
        <Path
          d={`M0 ${y(742)} C ${u(220)} ${y(770)} ${u(430)} ${y(772)} ${u(580)} ${y(752)} C ${u(700)} ${y(737)} ${u(790)} ${y(735)} ${width} ${y(742)} V ${height} H0 Z`}
          fill={colors.background}
        />
      </Svg>

      {showSettings && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account settings"
        hitSlop={8}
        onPress={() => router.push("/settings")}
        style={({ pressed }) => [
          styles.center,
          styles.gear,
          {
            left: u(728),
            top: y(102),
            width: u(80),
            height: u(80),
            borderRadius: u(40),
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name="settings" size={u(36)} color={colors.text} />
      </Pressable>
      )}

      <View
        style={[
          styles.center,
          {
            position: "absolute",
            left: u(avatar.cx - avatar.r),
            top: y(avatar.cy - avatar.r),
            width: u(avatar.r * 2),
            height: u(avatar.r * 2),
            borderRadius: u(avatar.r),
            overflow: "hidden",
          },
        ]}
        accessibilityLabel={name}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text maxFontSizeMultiplier={1} style={[styles.initials, { fontSize: u(46) }]}>{initials(name)}</Text>
        )}
      </View>

      <View style={{ position: "absolute", left: u(40), right: u(40), top: ay(avatar.halo + 14), alignItems: "center" }}>
        <Text maxFontSizeMultiplier={1} style={[styles.name, { fontSize: u(40), lineHeight: u(50) }]} numberOfLines={1} adjustsFontSizeToFit>
          {name}
        </Text>
        <Text maxFontSizeMultiplier={1} style={[styles.email, { fontSize: u(24), marginTop: u(4) }]} numberOfLines={1}>
          {email}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            left: u(45),
            right: u(45),
            top: y(525),
            height: u(180),
            borderRadius: u(24),
          },
        ]}
      >
        {stats.map((s, i) => (
          <View key={s.label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            {i > 0 && <View style={[styles.divider, { height: u(110) }]} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${s.label}: ${s.value}`}
              onPress={s.onPress}
              style={({ pressed }) => [styles.center, { flex: 1, alignSelf: "stretch" }, pressed && { opacity: 0.6 }]}
            >
              <Text maxFontSizeMultiplier={1} style={[styles.statValue, { fontSize: u(38), lineHeight: u(46) }]}>{s.value}</Text>
              <Text maxFontSizeMultiplier={1} style={[styles.statLabel, { fontSize: u(22) }]}>{s.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  gear: {
    position: "absolute",
    backgroundColor: colors.card,
    shadowColor: "#4B3FB0",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  initials: {
    fontFamily: fonts.semibold,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  name: {
    fontFamily: fonts.semibold,
    color: colors.text,
    includeFontPadding: false,
  },
  email: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  card: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: dk("rgba(255,255,255,0.96)", "rgba(30,30,54,0.97)"),
    shadowColor: "#4B3FB0",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.divider,
  },
  statValue: {
    fontFamily: fonts.semibold,
    color: colors.text,
    includeFontPadding: false,
  },
  statLabel: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    includeFontPadding: false,
  },
}));
