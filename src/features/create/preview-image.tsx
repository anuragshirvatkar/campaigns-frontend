// An image preview in the editor. Shows, fastest first: the photo on this phone (just uploaded), the
// phone-sized copy Cloudinary pre-built at upload, then the original if that copy fails.
// A spinner sits BEHIND the image: the image covers it the moment it's drawn, so the box is never empty
// and never stuck on a spinner over a loaded image. If everything fails, a tap tries again.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui";
import { localCopy, previewUrl } from "@/lib/image-preview";
import { colors, spacing, themed } from "@/theme";

export function PreviewImage({ url, transition = 150 }: { url: string; transition?: number }) {
  // 0 = fastest source, 1 = original, 2 = both failed (show retry)
  const [tries, setTries] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [shownUrl, setShownUrl] = useState(url);
  // A new image starts again from the fastest source
  if (shownUrl !== url) {
    setShownUrl(url);
    setTries(0);
  }
  const src = tries === 0 ? (localCopy(url) ?? previewUrl(url)) : url;
  return (
    <>
      <View style={styles.center} pointerEvents="none">
        <ActivityIndicator color={colors.primary} />
      </View>
      {tries < 2 ? (
        <Image
          key={`${src}#${attempt}`}
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={transition}
          onError={() => setTries((t) => t + 1)}
        />
      ) : (
        <Pressable
          style={[styles.center, styles.failed]}
          accessibilityRole="button"
          onPress={() => {
            setTries(0);
            setAttempt((n) => n + 1);
          }}
        >
          <Ionicons name="refresh" size={22} color={colors.textMuted} />
          <Text variant="caption" align="center">
            {"Couldn't load the image. Tap to try again."}
          </Text>
        </Pressable>
      )}
    </>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    center: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      padding: spacing.md,
    },
    failed: { backgroundColor: colors.primaryTint },
  }),
);
