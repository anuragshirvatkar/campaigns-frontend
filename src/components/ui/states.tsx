import Ionicons from "@expo/vector-icons/Ionicons";
import LottieView from "lottie-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import type { IconName } from "@/lib/labels";
import { colors, spacing, themed } from "@/theme";
import { Button } from "./button";
import { Bubbles } from "./decor";
import { Text } from "./text";

const ANIMATIONS = {
  empty: require("../../../assets/animations/empty-box.json"),
  offline: require("../../../assets/animations/no-internet.json"),
};

/** The shared "no data" and "no internet" animations; usable on their own too. */
export function StateAnimation({ kind, size = 230 }: { kind: keyof typeof ANIMATIONS; size?: number }) {
  return <LottieView source={ANIMATIONS[kind]} autoPlay loop style={{ width: size, height: size }} />;
}

type Props = {
  icon: IconName;
  /** Lottie instead of the icon. Defaults to the empty box for neutral empty states. */
  animation?: keyof typeof ANIMATIONS | "none";
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "primary" | "danger";
  compact?: boolean;
};

/** Empty, no-results and error screens share this shape: icon well, short message, one next action. */
export function EmptyState({ icon, animation, title, body, actionLabel, onAction, tone = "primary", compact }: Props) {
  const anim = animation ?? (tone === "primary" ? "empty" : "none");
  const fg = tone === "danger" ? colors.danger : colors.primary;
  const bg = tone === "danger" ? colors.dangerSoft : colors.primarySoft;
  return (
    <View style={[styles.wrap, compact && styles.compact]} accessibilityLiveRegion="polite">
      {anim !== "none" ? (
        <StateAnimation kind={anim} size={compact ? 180 : 230} />
      ) : (
        <View style={styles.art}>
          {!compact && <Bubbles variant="soft" />}
          <View style={[styles.well, { backgroundColor: bg }, compact && styles.wellSmall]}>
            <Ionicons name={icon} size={compact ? 26 : 36} color={fg} />
          </View>
        </View>
      )}
      <Text variant={compact ? "h3" : "h2"} align="center">
        {title}
      </Text>
      {body && (
        <Text variant="bodySm" align="center" style={styles.body}>
          {body}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant={compact ? "secondary" : "primary"} style={styles.action} />
      )}
    </View>
  );
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const offline = error instanceof ApiError && error.status === 0;
  return (
    <EmptyState
      tone="danger"
      compact={compact}
      icon={offline ? "cloud-offline-outline" : "alert-circle-outline"}
      animation={offline ? "offline" : "none"}
      title={offline ? "You're offline" : "Something went wrong"}
      body={error instanceof ApiError ? error.message : "Please try again."}
      actionLabel={onRetry ? "Try again" : undefined}
      onAction={onRetry}
    />
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.loading} accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.huge, paddingHorizontal: spacing.xxl, gap: spacing.sm },
  compact: { paddingVertical: spacing.xxl },
  art: { width: 140, height: 120, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  well: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  wellSmall: { width: 60, height: 60, borderRadius: 30 },
  body: { maxWidth: 300 },
  action: { marginTop: spacing.md, minWidth: 180 },
  loading: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center" },
}));
