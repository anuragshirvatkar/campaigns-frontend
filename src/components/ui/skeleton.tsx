import { useEffect } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radius, spacing, themed } from "@/theme";

export function Skeleton({ width = "100%", height = 14, round = radius.sm }: { width?: DimensionValue; height?: number; round?: number }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 650 }), -1, true));
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: round, backgroundColor: colors.surfaceAlt }, pulse]} />;
}

/** Placeholder shaped like a campaign card, for feed and list loading states. */
export function CampaignCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Loading campaign">
      <Skeleton height={160} round={radius.lg} />
      <View style={styles.body}>
        <Skeleton width="30%" height={10} />
        <Skeleton width="85%" height={18} />
        <Skeleton width="60%" height={12} />
        <Skeleton height={8} round={4} />
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.xl },
  body: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  sheet: { marginTop: -24, borderTopLeftRadius: radius.xl + 6, borderTopRightRadius: radius.xl + 6, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
}));

/** Placeholder for the campaign page while it loads: cover, chips, title, creator, funding card and tabs. */
export function CampaignPageSkeleton() {
  return (
    <View accessibilityLabel="Loading campaign">
      <Skeleton height={300} round={0} />
      <View style={styles.sheet}>
        <View style={styles.row}>
          <Skeleton width={84} height={26} round={radius.pill} />
          <Skeleton width={84} height={26} round={radius.pill} />
        </View>
        <Skeleton width="90%" height={26} />
        <Skeleton width="60%" height={26} />
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <Skeleton width={36} height={36} round={18} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="45%" height={14} />
            <Skeleton width="65%" height={11} />
          </View>
        </View>
        <Skeleton height={170} round={radius.lg} />
        <Skeleton height={48} round={radius.md} />
        <Skeleton width="95%" height={14} />
        <Skeleton width="88%" height={14} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
}
