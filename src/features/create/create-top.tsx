// Create tab pieces, laid out from theme references/create-draft-screen-reference.png
// (851px wide, status bar ~80px) and scaled to the screen width.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MyCampaignCard } from "@/api/types";
import { Text } from "@/components/ui";
import { CampaignThumb } from "@/features/campaigns/campaign-parts";
import { HomeHeader, useHomeScale } from "@/features/home/home-top";
import { timeAgo } from "@/lib/format";
import type { IconName } from "@/lib/labels";
import { colors, fonts, spacing, themed, dk } from "@/theme";
import { PressScale } from "@/components/ui/motion";

const REF_W = 851;
const CARD_H = 503;

const IMG = {
  pencil: require("../../../assets/images/create/pencil.png"),
  guy: require("../../../assets/images/create/guy.png"),
};

export function useCreateScale() {
  const { width } = useWindowDimensions();
  return (px: number) => (px * width) / REF_W;
}
type Scale = ReturnType<typeof useCreateScale>;

/** Short rounded accent dash, like the "sparks" around the reference illustrations. */
function Spark({ u, x, y, len, angle, color }: { u: Scale; x: number; y: number; len: number; angle: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: u(x - len / 2),
        top: u(y - 3),
        width: u(len),
        height: u(6),
        borderRadius: u(3),
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

/** Same header as the other tabs, then the two ways to start. */
export function CreateHero({
  starting,
  onManual,
  onVoice,
  hasUnread,
  user,
}: {
  starting: boolean;
  onManual: () => void;
  onVoice: () => void;
  hasUnread: boolean;
  user: { fullName: string; avatarUrl: string | null } | null;
}) {
  const insets = useSafeAreaInsets();
  const u = useCreateScale();
  const uh = useHomeScale();
  const headerBottom = insets.top + spacing.lg + uh(120);
  const cardTop = headerBottom + u(14);
  const height = cardTop + u(CARD_H);

  return (
    <View style={{ height }}>
      <View style={{ position: "absolute", left: 0, right: 0, top: insets.top + spacing.lg, paddingHorizontal: uh(22) }}>
        <HomeHeader u={uh} title="Start a campaign" hasUnread={hasUnread} user={user} />
      </View>

      {/* The two ways to start */}
      <OptionCard
        u={u}
        style={{ left: u(41), top: cardTop, width: u(383), height: u(503) }}
        primary
        icon="create-outline"
        title={starting ? "Starting…" : "Create manually"}
        body="A guided form with tips and a full preview before you submit."
        art={
          <Image
            source={IMG.pencil}
            style={{ position: "absolute", left: u(200), top: u(318), width: u(225), height: u(176) }}
            contentFit="contain"
          />
        }
        sparks={
          <>
            <Spark u={u} x={182} y={42} len={20} angle={-62} color="rgba(255,255,255,0.85)" />
            <Spark u={u} x={200} y={56} len={18} angle={-25} color="rgba(255,255,255,0.85)" />
            <Spark u={u} x={316} y={292} len={20} angle={72} color="#FFFFFF" />
            <Spark u={u} x={340} y={288} len={20} angle={-75} color="#FFFFFF" />
            <Spark u={u} x={362} y={306} len={18} angle={-35} color="#FFFFFF" />
          </>
        }
        disabled={starting}
        onPress={onManual}
      />
      <OptionCard
        u={u}
        style={{ left: u(444), top: cardTop, width: u(373), height: u(503) }}
        icon="mic-outline"
        title={"Create with\nyour voice"}
        body="Describe your idea out loud. AI turns it into an editable draft."
        art={
          <Image
            source={IMG.guy}
            style={{ position: "absolute", left: u(176), top: u(343), width: u(197), height: u(172) }}
            contentFit="contain"
          />
        }
        sparks={
          <>
            <Spark u={u} x={152} y={62} len={20} angle={-55} color={colors.primary} />
            <Spark u={u} x={163} y={79} len={18} angle={-15} color={colors.primary} />
            <Spark u={u} x={336} y={330} len={20} angle={-70} color={colors.primary} />
            <Spark u={u} x={355} y={342} len={18} angle={-30} color={colors.primary} />
          </>
        }
        onPress={onVoice}
      />
    </View>
  );
}

function OptionCard({
  u,
  style,
  primary,
  icon,
  title,
  body,
  art,
  sparks,
  disabled,
  onPress,
}: {
  u: Scale;
  style: object;
  primary?: boolean;
  icon: IconName;
  title: string;
  body: string;
  art: ReactNode;
  sparks: ReactNode;
  disabled?: boolean;
  onPress: () => void;
}) {
  const fg = primary ? "#FFFFFF" : colors.text;
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={title.replace("\n", " ")}
      accessibilityState={{ busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        primary ? styles.cardPrimary : styles.cardSoft,
        { borderRadius: u(30) },
        style,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {sparks}
      {art}
      <View
        style={[
          styles.center,
          {
            position: "absolute",
            left: u(31),
            top: u(43),
            width: u(92),
            height: u(92),
            borderRadius: u(20),
            backgroundColor: primary ? "rgba(255,255,255,0.2)" : colors.card,
          },
        ]}
      >
        <Ionicons name={icon} size={u(46)} color={primary ? "#FFFFFF" : colors.primary} />
      </View>
      <View style={{ position: "absolute", left: u(32), right: u(24), top: u(152) }}>
        <Text maxFontSizeMultiplier={1} style={[styles.cardTitle, { color: fg, fontSize: u(33), lineHeight: u(40) }]}>{title}</Text>
        <Text maxFontSizeMultiplier={1}
          style={[
            styles.body,
            {
              color: primary ? "rgba(255,255,255,0.9)" : colors.textMuted,
              fontSize: u(23.5),
              lineHeight: u(35),
              marginTop: u(10),
              width: u(300),
            },
          ]}
        >
          {body}
        </Text>
      </View>
      <View
        style={[
          styles.center,
          {
            position: "absolute",
            left: u(31),
            top: u(395),
            width: u(76),
            height: u(76),
            borderRadius: u(38),
            backgroundColor: primary ? "#FFFFFF" : dk("#E7E3FC", "#322D66"),
          },
        ]}
      >
        <Ionicons name="arrow-forward" size={u(34)} color={primary ? "#5B48EA" : colors.primary} />
      </View>
    </PressScale>
  );
}

const STEPS: { title: string; body: string }[] = [
  { title: "About", body: "Title, category and details" },
  { title: "Story", body: "Share why it matters" },
  { title: "Visuals", body: "Images or videos" },
  { title: "Reach", body: "Pick who sees it" },
  { title: "Submit", body: "Set goal and publish" },
];

/** "What you'll do": the five editor steps as numbered circles on one connecting line. */
export function StepsStrip() {
  const u = useCreateScale();
  const centers = [96, 262, 426, 589, 752];
  const r = 44;
  return (
    <View style={{ marginTop: u(48) }}>
      <Text maxFontSizeMultiplier={1} style={[styles.overlineMuted, { fontSize: u(21), letterSpacing: u(2.2), marginLeft: u(45) }]}>WHAT YOU’LL DO</Text>
      <View style={{ height: u(230), marginTop: u(16) }}>
        <View
          style={[styles.connector, { left: u(centers[0]!), width: u(centers[4]! - centers[0]!), top: u(r - 1.5), height: u(3) }]}
        />
        {STEPS.map((s, i) => {
          const cx = centers[i]!;
          return (
            <View key={s.title} style={{ position: "absolute", left: u(cx - 80), width: u(160), top: 0, alignItems: "center" }}>
              <View
                style={[
                  styles.center,
                  styles.stepCircle,
                  { width: u(r * 2), height: u(r * 2), borderRadius: u(r), borderWidth: u(6) },
                ]}
              >
                <Text maxFontSizeMultiplier={1} style={[styles.stepNum, { fontSize: u(32) }]}>{i + 1}</Text>
              </View>
              <Text maxFontSizeMultiplier={1} style={[styles.stepTitle, { fontSize: u(22), marginTop: u(16) }]}>{s.title}</Text>
              <Text maxFontSizeMultiplier={1} style={[styles.stepBody, { fontSize: u(20.5), lineHeight: u(29), marginTop: u(6) }]}>{s.body}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** White card for one saved draft: image (or the globe illustration), title, progress, Resume and delete. */
export function DraftTile({
  draft: d,
  onResume,
  onDelete,
  deleting,
}: {
  draft: MyCampaignCard;
  onResume: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const u = useCreateScale();
  const image = d.squareImageUrl ?? d.coverImageUrl;
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Resume ${d.title || "untitled draft"}`}
      onPress={onResume}
      style={({ pressed }) => [
        styles.draft,
        { marginHorizontal: u(43), padding: u(18), gap: u(28), borderRadius: u(24), marginBottom: u(18) },
        pressed && { opacity: 0.94 },
      ]}
    >
      <CampaignThumb uri={image} size={u(136)} />
      <View style={{ flex: 1, gap: u(14) }}>
        <View>
          <Text maxFontSizeMultiplier={1} style={[styles.draftTitle, { fontSize: u(25), lineHeight: u(33) }]} numberOfLines={2}>
            {d.title || "Untitled draft"}
          </Text>
          <Text maxFontSizeMultiplier={1} style={[styles.body, { fontSize: u(21), marginTop: u(6) }]} numberOfLines={1}>
            Step {d.currentStep} of 5 · edited {timeAgo(d.updatedAt)}
          </Text>
        </View>
        {/* Actions on one row: Resume, then delete as an equally tappable circle */}
        <View style={[styles.row, { gap: u(14) }]}>
          <View style={[styles.center, styles.resume, { flex: 1, height: u(64), borderRadius: u(32) }]}>
            <Text maxFontSizeMultiplier={1} style={[styles.resumeText, { fontSize: u(22) }]}>Resume</Text>
          </View>
          <PressScale scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`Delete draft ${d.title ?? ""}`}
            hitSlop={8}
            disabled={deleting}
            onPress={onDelete}
            style={({ pressed }) => [
              styles.center,
              styles.trash,
              { width: u(64), height: u(64), borderRadius: u(32) },
              pressed && { opacity: 0.5 },
            ]}
          >
            <Ionicons name="trash-outline" size={u(30)} color={colors.danger} />
          </PressScale>
        </View>
      </View>
    </PressScale>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  overlineMuted: { fontFamily: fonts.semibold, color: colors.textMuted, includeFontPadding: false },
  body: { fontFamily: fonts.regular, color: colors.textMuted, includeFontPadding: false },
  card: { position: "absolute", overflow: "hidden" },
  cardPrimary: {
    backgroundColor: dk("#5B48EA", "#5E4BEB"),
    shadowColor: "#4B3FB0",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardSoft: {
    backgroundColor: dk("#F4F2FE", "#1D1C3A"),
    borderWidth: 1,
    borderColor: dk("#ECE8FD", "#2E2B57"),
    shadowColor: "#4B3FB0",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: { fontFamily: fonts.semibold, includeFontPadding: false },
  connector: { position: "absolute", borderRadius: 2, backgroundColor: dk("#E2DCFB", "#34306A") },
  // Very light fill; the white ring lifts it off the connecting line
  stepCircle: { backgroundColor: dk("#F6F4FF", "#1D1C3A"), borderColor: dk("#CFC6FA", "#4A4290") },
  stepNum: { fontFamily: fonts.semibold, color: colors.primary, includeFontPadding: false },
  stepTitle: { fontFamily: fonts.semibold, color: colors.text, includeFontPadding: false },
  stepBody: {
    fontFamily: fonts.regular,
    color: dk("#5C5D7E", "#B4B5D0"), // a step darker than textMuted so the small lines stay readable
    textAlign: "center",
    includeFontPadding: false,
  },
  draft: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    shadowColor: "#4B3FB0",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  draftTitle: { fontFamily: fonts.semibold, color: colors.text, includeFontPadding: false },
  trash: { backgroundColor: colors.dangerSoft },
  resume: { backgroundColor: colors.primarySoft },
  resumeText: { fontFamily: fonts.medium, color: colors.primary, includeFontPadding: false },
}));
