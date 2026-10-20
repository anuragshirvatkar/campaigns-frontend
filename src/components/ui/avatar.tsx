import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { colors, themed } from "@/theme";
import { Text } from "./text";

const PALETTE = themed(() => [colors.primary, colors.teal, colors.coral, colors.blue, colors.amber, colors.navy]);

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function Avatar({ name, url, size = 40, color: fixed }: { name: string; url?: string | null; size?: number; color?: string }) {
  const color = fixed ?? PALETTE[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PALETTE.length]!;
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={{ uri: url }} style={box} contentFit="cover" accessibilityLabel={name} />;
  return (
    <View style={[styles.fallback, box, { backgroundColor: color }]} accessibilityLabel={name}>
      <Text variant="title" color={colors.textOnDark} style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
}));
