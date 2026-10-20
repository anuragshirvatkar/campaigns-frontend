import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { forwardRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, type TextInputProps } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { IconName } from "@/lib/labels";
import { fonts, themed, dk, colors } from "@/theme";

// The login screen is laid out in the reference image's pixels (screen is 718px wide there)
// and scaled to the device width, so proportions match the design on every phone.
export const REF_WIDTH = 718;

export type Scale = (v: number) => number;

/** Converts reference px to dp for this device width */
export function useRefScale(): Scale {
  const { width } = useWindowDimensions();
  return (v: number) => (v * width) / REF_WIDTH;
}

// Comfortable touch size, between the reference proportions (~48dp on a 400dp-wide phone) and
// Material's 56dp text field; well above the 48dp minimum touch target.
export const FIELD_MIN = 52;
const INPUT_FONT_MIN = 16;

// Colours sampled from the reference
export const LOGIN = themed(() => ({
  heroBg: dk("#F6F6FD", "#14152A"),
  heroCircle: dk("#EFEEFD", "#1E1E3C"),
  ink: dk("#111A48", "#ECECF8"),
  body: dk("#6B6F8A", "#A3A4C2"),
  placeholder: dk("#6E7590", "#8A8CAB"),
  icon: dk("#5F6784", "#A3A6C4"),
  border: dk("#E6E9F2", "#2C2D4A"),
  line: dk("#E3E7F0", "#2C2D4A"),
  accent: dk("#7260FB", "#7B68FF"),
  accentPressed: dk("#5E4BEB", "#6A56F0"),
  link: dk("#5B4DF2", "#A497FF"),
  or: dk("#7A8098", "#8A8CAB"),
  google: dk("#161A3E", "#ECECF8"),
  error: dk("#E5534B", "#F06A62"),
}));

// Rubik's vertical metrics: with an explicit lineHeight the baseline sits at
// top + lineHeight/2 + 0.3425 * fontSize, so this places text by its baseline.
export function topForBaseline(baseline: number, fontSize: number, lineHeight: number) {
  return baseline - lineHeight / 2 - 0.3425 * fontSize;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const press = { damping: 18, stiffness: 320, mass: 0.6 };

type FieldProps = TextInputProps & { u: Scale; icon: IconName; error?: string; right?: ReactNode };

/** Outlined input with a leading icon; the border eases to violet on focus. */
export const AuthInput = forwardRef<TextInput, FieldProps>(function AuthInput({ u, icon, error, right, onFocus, onBlur, ...input }, ref) {
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);
  // Plain values for the worklet (LOGIN is a theme proxy, which can't cross to the UI thread)
  const [errorColor, idle, active] = [LOGIN.error, LOGIN.border, LOGIN.accent];
  const border = useAnimatedStyle(() => ({
    borderColor: error ? errorColor : interpolateColor(focus.value, [0, 1], [idle, active]),
  }));

  return (
    <View>
      <Animated.View
        style={[styles.field, { height: Math.max(u(85), FIELD_MIN), borderRadius: u(18), paddingLeft: u(30), paddingRight: u(24) }, border]}
      >
        <Ionicons name={icon} size={Math.max(u(37), 22)} color={focused ? LOGIN.accent : LOGIN.icon} />
        <TextInput maxFontSizeMultiplier={1}
          ref={ref}
          {...input}
          placeholderTextColor={LOGIN.placeholder}
          selectionColor={LOGIN.accent}
          cursorColor={LOGIN.accent}
          style={[styles.input, { fontSize: Math.max(u(26), INPUT_FONT_MIN), marginLeft: u(98 - 30 - 37) }]}
          onFocus={(e) => {
            setFocused(true);
            focus.set(withTiming(1, { duration: 180 }));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.set(withTiming(0, { duration: 180 }));
            onBlur?.(e);
          }}
        />
        {right}
      </Animated.View>
      {error ? <Text maxFontSizeMultiplier={1} style={[styles.error, { fontSize: u(21), marginTop: u(8) }]}>{error}</Text> : null}
    </View>
  );
});

/** Filled violet button: squeezes on press and the arrow nudges forward. */
export function PrimaryButton({ u, label, onPress, loading }: { u: Scale; label: string; onPress: () => void; loading?: boolean }) {
  const p = useSharedValue(0);
  const [bg, bgPressed] = [LOGIN.accent, LOGIN.accentPressed];
  const body = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.035 * p.value }],
    backgroundColor: interpolateColor(p.value, [0, 1], [bg, bgPressed]),
  }));
  const nudge = u(8);
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateX: nudge * p.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!loading }}
      disabled={loading}
      onPressIn={() => p.set(withSpring(1, press))}
      onPressOut={() => p.set(withSpring(0, press))}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.center, { height: Math.max(u(82), FIELD_MIN), borderRadius: u(20) }, body]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text maxFontSizeMultiplier={1} style={[styles.primaryLabel, { fontSize: Math.max(u(28.5), 16) }]}>{label}</Text>
          <Animated.View style={[styles.arrow, { right: u(37) }, arrow]}>
            <Ionicons name="arrow-forward" size={u(34)} color="#FFFFFF" />
          </Animated.View>
        </>
      )}
    </AnimatedPressable>
  );
}

/** Outlined "Continue with Google" button with the same press squeeze. */
export function GoogleButton({ u, onPress, loading }: { u: Scale; onPress: () => void; loading?: boolean }) {
  const p = useSharedValue(0);
  const [bg, bgPressed] = [colors.card, colors.primaryTint];
  const body = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.03 * p.value }],
    backgroundColor: interpolateColor(p.value, [0, 1], [bg, bgPressed]),
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPressIn={() => p.set(withSpring(1, press))}
      onPressOut={() => p.set(withSpring(0, press))}
      onPress={onPress}
      style={[styles.center, styles.row, styles.outlined, { height: Math.max(u(85), FIELD_MIN), borderRadius: u(18), gap: u(32) }, body]}
    >
      {loading ? <ActivityIndicator color={colors.primary} style={{ width: u(49) }} /> : <GoogleLogo size={u(49)} />}
      <Text maxFontSizeMultiplier={1} style={[styles.googleLabel, { fontSize: Math.max(u(26.5), 16) }]}>Continue with Google</Text>
    </AnimatedPressable>
  );
}

function GoogleLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const styles = themed(() => StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", borderWidth: 1, backgroundColor: colors.card },
  input: { flex: 1, alignSelf: "stretch", fontFamily: fonts.regular, color: LOGIN.ink, padding: 0, includeFontPadding: false },
  error: { fontFamily: fonts.regular, color: LOGIN.error },
  center: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row" },
  outlined: { borderWidth: 1, borderColor: LOGIN.border },
  primaryLabel: { fontFamily: fonts.medium, color: "#FFFFFF", includeFontPadding: false },
  arrow: { position: "absolute" },
  googleLabel: { fontFamily: fonts.medium, color: LOGIN.google, includeFontPadding: false },
}));

/** AuthInput for passwords, with the show/hide eye button */
export const PasswordInput = forwardRef<TextInput, Omit<FieldProps, "icon" | "right" | "secureTextEntry">>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    const { u } = props;
    return (
      <AuthInput maxFontSizeMultiplier={1}
        ref={ref}
        icon="lock-closed-outline"
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        secureTextEntry={!visible}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            hitSlop={12}
            onPress={() => setVisible((v) => !v)}
          >
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={u(40)} color={LOGIN.icon} />
          </Pressable>
        }
      />
    );
  },
);
