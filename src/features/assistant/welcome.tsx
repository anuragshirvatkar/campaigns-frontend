// Sam's hello: shown once per account (and again from Settings). One card next to Sam that says who
// he is and how to use him, while he says it out loud.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
} from "react-native-reanimated";
import { Text } from "@/components/ui";
import { colors, dk, fonts, radius, shadow, spacing, themed } from "@/theme";

const SAM_IMAGE = require("../../../assets/images/sam.png");
const WELCOME_AUDIO = require("../../../assets/audio/sam-welcome.mp3");

const HOW: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "mic-outline", text: "Tap me and talk" },
  { icon: "chatbubble-ellipses-outline", text: "Double-tap me to type" },
  {
    icon: "close-circle-outline",
    text: "Drag me onto the cross to hide me (bring me back in Settings)",
  },
];

export function SamWelcome({
  bottom,
  play,
  stop,
  onDone,
}: {
  /** Distance from the bottom of the screen to just above Sam */
  bottom: number;
  play: (clip: number) => Promise<void>;
  stop: () => void;
  onDone: () => void;
}) {
  useEffect(() => {
    void play(WELCOME_AUDIO);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        style={[StyleSheet.absoluteFill, styles.scrim]}
        onPress={onDone}
        accessibilityLabel="Close"
      />
      <Animated.View
        entering={FadeInDown.delay(150).duration(300)}
        exiting={FadeOutDown.duration(180)}
        style={[styles.card, { bottom }]}
      >
        <View style={styles.head}>
          <Image
            source={SAM_IMAGE}
            style={styles.avatar}
            contentFit="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Hey, I&apos;m Sam!</Text>
            <Text variant="caption">Your guide in Campaigns</Text>
          </View>
        </View>
        <Text variant="body" color={colors.text}>
          I can help you find campaigns, get around the app, and draft your own
          campaign.
        </Text>
        <View style={styles.how}>
          {HOW.map((h) => (
            <View key={h.icon} style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name={h.icon} size={16} color={colors.primary} />
              </View>
              <Text variant="bodySm" color={colors.text} style={{ flex: 1 }}>
                {h.text}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={styles.button}
        >
          <Text
            variant="title"
            color={colors.textOnDark}
            style={{ fontSize: 15 }}
          >
            Got it
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    scrim: { backgroundColor: dk("rgba(27,26,58,0.35)", "rgba(0,0,0,0.5)") },
    card: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      ...shadow.card,
    },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    title: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
    how: { gap: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    icon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    button: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
  }),
);
