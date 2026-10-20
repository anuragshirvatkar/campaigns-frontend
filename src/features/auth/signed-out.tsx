import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PrimaryButton } from "@/features/auth/login-kit";
import { fonts, spacing, themed, colors } from "@/theme";

const ART = require("../../../assets/images/not-logged-in.png");
const ART_RATIO = 344 / 720;

/** Shown on tabs that need an account: illustration, why to sign in, Log in / Sign up. */
export function SignedOut({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  const { width } = useWindowDimensions();
  const artW = Math.min(width * 0.68, 290);
  const u = (v: number) => (v * width) / 718; // login-kit sizes are in its reference px

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.duration(450)}>
        <Image source={ART} style={{ width: artW, height: artW * ART_RATIO, alignSelf: "center" }} contentFit="contain" />
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.text}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(450).delay(160)} style={styles.actions}>
        <PrimaryButton u={u} label="Log in" onPress={() => router.push("/login")} />
        <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push("/signup")} style={styles.signupRow}>
          <Text style={styles.signupPrompt}>
            New here? <Text style={styles.signup}>Create an account</Text>
          </Text>
        </Pressable>
      </Animated.View>
      {children}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { paddingTop: spacing.xxxl, paddingHorizontal: spacing.xs },
  text: { alignItems: "center", marginTop: spacing.xl, paddingHorizontal: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 27, color: colors.text, textAlign: "center" },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
  actions: { marginTop: spacing.xxl, gap: spacing.md },
  signupRow: { alignSelf: "center", minHeight: 40, justifyContent: "center" },
  signupPrompt: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  signup: { fontFamily: fonts.semibold, color: colors.primary },
}));
