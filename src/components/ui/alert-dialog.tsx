// App-styled replacement for Alert.alert: same call shape, shown as a card that pops in over a
// dimmed backdrop. Call showAlert() from anywhere; <AlertHost /> in the root layout renders it.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, Keyframe } from "react-native-reanimated";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, shadow, spacing, themed } from "@/theme";

export type AlertButton = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };
type AlertSpec = { title: string; message?: string; buttons: AlertButton[] };

const EXIT_MS = 120;

// A quick, plain pop: a touch smaller and transparent → full size, no overshoot
const popIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(160);
const popOut = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.97 }] },
}).duration(EXIT_MS);

let present: ((spec: AlertSpec) => void) | null = null;

/** Drop-in for Alert.alert(title, message, buttons). Falls back to the system alert if no host is mounted. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const spec = { title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] };
  if (present) present(spec);
  else Alert.alert(title, message, buttons);
}

export function AlertHost() {
  const [current, setCurrent] = useState<AlertSpec | null>(null);
  const [open, setOpen] = useState(false);
  const queue = useRef<AlertSpec[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    present = (spec) => {
      if (busy.current) return void queue.current.push(spec);
      busy.current = true;
      setCurrent(spec);
      setOpen(true);
    };
    return () => {
      present = null;
    };
  }, []);

  // Let the card animate out, then run the button's action (which may open the next alert)
  const close = (after?: () => void) => {
    setOpen(false);
    setTimeout(() => {
      busy.current = false;
      setCurrent(null);
      after?.();
      const next = queue.current.shift();
      if (next) present?.(next);
    }, EXIT_MS + 20);
  };

  if (!current) return null;
  const destructive = current.buttons.some((b) => b.style === "destructive");
  const cancel = current.buttons.find((b) => b.style === "cancel");
  // Side by side only when both labels comfortably fit; longer ones ("Cancel campaign") stack full width
  const stacked = current.buttons.length > 2 || current.buttons.some((b) => b.text.length > 11);
  // Two buttons sit side by side with cancel first; more stack with cancel last
  const ordered = stacked
    ? [...current.buttons.filter((b) => b !== cancel), ...(cancel ? [cancel] : [])]
    : [...(cancel ? [cancel] : []), ...current.buttons.filter((b) => b !== cancel)];
  const icon: IconName = destructive ? "warning-outline" : stacked ? "ellipsis-horizontal" : "help-circle-outline";

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => close(cancel?.onPress)}>
      {open && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(EXIT_MS)} style={styles.backdrop}>
          {/* Tapping outside counts as cancel, like the system dialog */}
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={() => close(cancel?.onPress)} />
          <Animated.View
            entering={popIn}
            exiting={popOut}
            style={styles.card}
            accessibilityRole="alert"
            accessibilityViewIsModal
          >
            <View style={[styles.iconWell, { backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft }]}>
              <Ionicons name={icon} size={28} color={destructive ? colors.danger : colors.primary} />
            </View>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {current.title}
            </Text>
            {current.message ? (
              <Text style={styles.message} maxFontSizeMultiplier={1.3}>
                {current.message}
              </Text>
            ) : null}
            <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
              {ordered.map((b) => {
                const kind = b.style === "destructive" ? styles.btnDanger : b.style === "cancel" ? styles.btnCancel : styles.btnPrimary;
                const label = b.style === "cancel" ? styles.labelCancel : styles.labelSolid;
                return (
                  <Pressable
                    key={b.text}
                    accessibilityRole="button"
                    onPress={() => {
                      if (b.style === "destructive") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                      close(b.onPress);
                    }}
                    style={({ pressed }) => [styles.btn, !stacked && { flex: 1 }, kind, pressed && styles.pressed]}
                  >
                    <Text style={[styles.label, label]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2}>
                      {b.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: spacing.xxl },
    card: {
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.xl + 4,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xl,
      ...shadow.raised,
    },
    iconWell: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
    title: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25, color: colors.text, textAlign: "center" },
    message: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
    buttons: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch", marginTop: spacing.xxl },
    buttonsStacked: { flexDirection: "column", gap: spacing.sm },
    btn: { minHeight: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
    btnPrimary: { backgroundColor: colors.primary },
    btnDanger: { backgroundColor: colors.danger },
    btnCancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    label: { fontFamily: fonts.semibold, fontSize: 15 },
    labelSolid: { color: "#FFFFFF" },
    labelCancel: { color: colors.text },
  }),
);
