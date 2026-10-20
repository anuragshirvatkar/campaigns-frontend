import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { Skeleton, Text } from "@/components/ui";
import { fonts, radius, spacing, themed, dk, colors } from "@/theme";

export const HOME = themed(() => ({
  ink: dk("#111A48", "#ECECF8"),
  body: dk("#6B6F8A", "#A3A4C2"),
  heroBg: dk("#F3F2FE", "#1B1A36"),
  border: dk("#ECEBF7", "#2C2D4A"),
  accent: dk("#5B4DF8", "#8E80FF"),
}));

const STEPS = [
  {
    title: "Create",
    body: "Write your message, add sources and choose who it should reach.",
    image: require("../../../assets/images/home/step-create.png"),
  },
  {
    title: "Review",
    body: "We check the content and sources before it goes live.",
    image: require("../../../assets/images/home/step-review.png"),
  },
  {
    title: "Amplify",
    body: "Backers fund ads that carry it to people beyond your network.",
    image: require("../../../assets/images/home/step-amplify.png"),
  },
];

const TILE = 84;

/** Three steps as a simple timeline: picture tile, then number, title and one line of detail. */
export function HowItWorks() {
  return (
    <View>
      {STEPS.map((s, i) => (
        <View key={s.title}>
          {i > 0 && <View style={styles.link} />}
          <View style={styles.step}>
            <View style={styles.tile}>
              <Image source={s.image} style={styles.tileImg} contentFit="contain" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.head}>
                <View style={styles.num}>
                  <Text maxFontSizeMultiplier={1} style={styles.numText}>{i + 1}</Text>
                </View>
                <Text maxFontSizeMultiplier={1} style={styles.title}>{s.title}</Text>
              </View>
              <Text maxFontSizeMultiplier={1} style={styles.body}>{s.body}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function FeaturedRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={104} height={150} round={radius.md} />
      <View style={[styles.rowBody, { gap: 10 }]}>
        <Skeleton width={70} height={16} />
        <Skeleton width="90%" height={18} />
        <Skeleton width="60%" height={12} />
        <Skeleton width="100%" height={6} />
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  step: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  tile: { width: TILE, height: TILE, borderRadius: 22, backgroundColor: dk("#FFFFFF", "#24233F"), alignItems: "center", justifyContent: "center" },
  tileImg: { width: TILE - 14, height: TILE - 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Dashed line from one tile down to the next
  link: {
    width: 0,
    height: 22,
    marginLeft: TILE / 2,
    marginVertical: 6,
    borderLeftWidth: 1.5,
    borderStyle: "dashed",
    borderColor: HOME.accent,
  },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: HOME.accent, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.bold, fontSize: 13, color: "#FFFFFF" },
  title: { fontFamily: fonts.bold, fontSize: 17, color: HOME.ink },
  body: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19, color: HOME.body },

  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: HOME.border,
  },
  rowBody: { flex: 1, gap: 5 },
}));
