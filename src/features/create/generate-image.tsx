// "Generate with AI": describe a picture, wait ~30 seconds, then use it or try again.
// The result is stored like an upload; generated images carry a small "AI" badge wherever they're edited.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { platformApi } from "@/api/platform";
import type { Upload } from "@/api/types";
import { Button, IconButton, Text, TextField } from "@/components/ui";
import { colors, fonts, radius, spacing, themed } from "@/theme";

/** Generated images live in their own Cloudinary folder, so the URL tells them apart. */
export const isAiImage = (url: string | null | undefined) => !!url && url.includes("/generated/");

export function GenerateImageSheet({
  visible,
  kind,
  suggestion,
  onClose,
  onUse,
}: {
  visible: boolean;
  kind: "cover" | "ad";
  /** Pre-filled description, from the campaign title and summary */
  suggestion: string;
  onClose: () => void;
  onUse: (image: Upload) => void;
}) {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState(suggestion);
  const generate = useMutation({ mutationFn: () => platformApi.generateImage(prompt.trim(), kind) });
  const aspect = kind === "cover" ? 1536 / 1024 : 1;

  const close = () => {
    if (!generate.isPending) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      // Fresh start each time the sheet opens
      onShow={() => {
        setPrompt(suggestion);
        generate.reset();
      }}
    >
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text variant="h3" style={{ flex: 1 }}>
            {kind === "cover" ? "Generate a cover" : "Generate an ad image"}
          </Text>
          <IconButton icon="close" label="Close" onPress={close} disabled={generate.isPending} />
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          {generate.isPending ? (
            <Shimmer aspect={aspect} />
          ) : generate.data ? (
            <View style={[styles.frame, { aspectRatio: aspect }]}>
              <Image source={{ uri: generate.data.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <AiBadge />
            </View>
          ) : (
            <TextField
              label="Describe the image"
              multiline
              minLines={4}
              value={prompt}
              onChangeText={setPrompt}
              maxLength={1000}
              placeholder="e.g. Children filling bottles at a clean school water tap"
              error={generate.isError ? (generate.error instanceof ApiError ? generate.error.message : "Couldn't create the image.") : null}
              hint="A realistic photo. No text, logos or real people."
            />
          )}

          {generate.data ? (
            <View style={{ gap: spacing.sm }}>
              <Button
                label="Use this image"
                icon="checkmark"
                block
                onPress={() => {
                  onUse(generate.data!);
                  onClose();
                }}
              />
              <Button label="Try again" variant="ghost" block onPress={() => generate.reset()} />
            </View>
          ) : (
            <Button
              label={generate.isPending ? "Creating…" : "Generate"}
              icon="sparkles"
              block
              loading={generate.isPending}
              disabled={prompt.trim().length < 10}
              onPress={() => generate.mutate()}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Soft violet placeholder with a light sweep and pulsing sparkles while the image is made. */
function Shimmer({ aspect }: { aspect: number }) {
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    sweep.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false));
    pulse.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [sweep, pulse]);
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -260 + sweep.value * 620 }, { rotate: "18deg" }] }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.value * 0.45, transform: [{ scale: 0.92 + pulse.value * 0.12 }] }));
  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.frame, styles.placeholder, { aspectRatio: aspect }]}>
        <Animated.View style={[styles.sweep, sweepStyle]} />
        <Animated.View style={pulseStyle}>
          <Ionicons name="sparkles" size={40} color={colors.primary} />
        </Animated.View>
      </View>
      <Text variant="bodySm" align="center">
        Creating your image. This takes about half a minute.
      </Text>
    </View>
  );
}

/** Small label on images made with AI. */
export function AiBadge({ style }: { style?: object }) {
  return (
    <View style={[styles.badge, style]} accessibilityLabel="AI-generated image">
      <Ionicons name="sparkles" size={11} color="#FFFFFF" />
      <Text style={styles.badgeText}>AI</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  body: { padding: spacing.xl, gap: spacing.xl },
  frame: { width: "100%", borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surface },
  placeholder: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  sweep: { position: "absolute", top: -40, bottom: -40, width: 90, backgroundColor: "rgba(255,255,255,0.45)" },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(38,38,74,0.72)",
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, color: "#FFFFFF", includeFontPadding: false },
}));
