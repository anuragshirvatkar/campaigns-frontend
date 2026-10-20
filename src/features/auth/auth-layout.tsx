import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useToast } from "@/components/ui";
import { fonts, themed, colors } from "@/theme";
import { AuthHero, type HeroArt } from "./auth-hero";
import { useAuth } from "./auth-provider";
import { getGoogleIdToken, GoogleSignInError } from "./google-sign-in";
import { GoogleButton, LOGIN, PrimaryButton, topForBaseline, useRefScale } from "./login-kit";

/** Staggered slide-up used for every block on the auth screens */
export const enterAt = (delay: number) => FadeInDown.duration(450).delay(delay);

type Props = {
  art: HeroArt;
  /** Where the white card starts, in reference px (see login-kit) */
  cardTop: number;
  title: string;
  /** Baseline of the title's first line, reference px */
  titleBaseline: number;
  subtitle: string;
  subtitleBaseline: number;
  onTitleLongPress?: () => void;
  /** The fields (and anything between them and the submit button) */
  children: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  loading: boolean;
  /** Request failure, shown under the submit button */
  error: string | null;
  footerPrompt: string;
  footerAction: string;
  onFooter: () => void;
};

/**
 * Shared frame for login and sign-up: illustrated header, white card with the form, submit
 * button with its error, "or continue with Google" and the switch-screen footer.
 */
export function AuthLayout(props: Props) {
  const { art, cardTop, error } = props;
  const u = useRefScale();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { signIn } = useAuth();
  const [googleBusy, setGoogleBusy] = useState(false);
  async function continueWithGoogle() {
    setGoogleBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return; // backed out of the picker
      const auth = await authApi.google({ idToken });
      await signIn(auth);
      toast(`Welcome, ${auth.user.fullName.split(" ")[0]}`);
    } catch (err) {
      toast(err instanceof GoogleSignInError || err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.", "error");
    } finally {
      setGoogleBusy(false);
    }
  }

  const scrollRef = useRef<ScrollView>(null);

  const [screenH, setScreenH] = useState(0);
  const [viewH, setViewH] = useState(0);
  const [formH, setFormH] = useState(0);
  const [submitBottom, setSubmitBottom] = useState(0);
  const [keyboard, setKeyboard] = useState<{ height: number; top: number } | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboard({ height: e.endCoordinates.height, top: e.endCoordinates.screenY }),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboard(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Where the visible area ends while the keyboard is up. Android: with edge-to-edge the keyboard
  // covers the screen, but some phones (e.g. ColorOS) shrink the window instead, so it's whichever
  // comes first, and only the covered part gets padded. iOS: KeyboardAvoidingView pads by its height.
  const visibleH = !keyboard ? viewH : Platform.OS === "android" ? Math.min(viewH, keyboard.top) : viewH - keyboard.height;
  const keyboardPad = Platform.OS === "android" && keyboard ? Math.max(0, viewH - keyboard.top) : 0;

  // Fit everything on one screen (no scrolling, even with an error showing): if the form doesn't
  // fit under the hero, the hero gives up space, first the blank area above the title (kept
  // clear of the status bar), then a little of the art tucked under the card, and last the
  // spacing around the buttons tightens (up to 45%). Only very short screens still scroll.
  // formH is the form's natural height: measured, plus whatever squeeze that layout had.
  const cardPadTop = u(38.5);
  const cardPadBottom = Math.max(u(48), insets.bottom + u(24));
  const topRoom = u(topForBaseline(162, 40, 48)); // how far the hero may slide up
  const deficit = screenH && formH ? Math.max(0, u(cardTop) + cardPadTop + formH + cardPadBottom - screenH) : 0;
  const shift = Math.min(deficit, Math.max(0, topRoom - insets.top - 12));
  const tuck = Math.min(deficit - shift, u(36));
  const heroH = u(cardTop) - shift - tuck;
  const squeezable = u(29.5 + 38.5 + 38.5 + 40); // the gaps passed through gap() below
  const squeeze = Math.min(deficit - shift - tuck, squeezable * 0.45);
  const gap = (v: number) => u(v) * (1 - squeeze / squeezable);
  const settle = LinearTransition.duration(240);

  // While typing, scroll just enough to keep the submit button (and its error) above the keyboard,
  // leaving as much of the illustration in view as possible
  const keepVisible = heroH + cardPadTop + submitBottom + u(20);
  const scrollY = Math.max(0, keepVisible - visibleH);
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: keyboard ? scrollY : 0, animated: true });
  }, [keyboard, scrollY]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // Keep the full height: a window shrunk by the keyboard must not re-squeeze the layout
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        setScreenH((prev) => Math.max(prev, h));
        setViewH(h);
      }}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: keyboardPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View layout={settle} style={{ height: heroH }}>
          <Animated.View layout={settle} style={[styles.abs, { left: 0, right: 0, top: -shift, height: u(cardTop) }]}>
            <AuthHero art={art} u={u} />

            <Animated.View
              entering={enterAt(60)}
              style={[styles.abs, { left: u(64), top: u(topForBaseline(props.titleBaseline, 68, 67)) }]}
            >
              <Pressable onLongPress={props.onTitleLongPress} delayLongPress={600} disabled={!props.onTitleLongPress}>
                <Text maxFontSizeMultiplier={1} accessibilityRole="header" style={[styles.title, { fontSize: u(68), lineHeight: u(67), letterSpacing: u(-1.5) }]}>
                  {props.title}
                </Text>
              </Pressable>
            </Animated.View>
            <Animated.View
              entering={enterAt(140)}
              style={[styles.abs, { left: u(64), top: u(topForBaseline(props.subtitleBaseline, 28, 37.5)) }]}
            >
              <Text maxFontSizeMultiplier={1} style={[styles.subtitle, { fontSize: u(28), lineHeight: u(37.5) }]}>{props.subtitle}</Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <View
          style={[
            styles.card,
            {
              borderTopLeftRadius: u(64),
              borderTopRightRadius: u(64),
              paddingHorizontal: u(64),
              paddingTop: cardPadTop,
              paddingBottom: cardPadBottom,
            },
          ]}
        >
          <View onLayout={(e) => setFormH(e.nativeEvent.layout.height + squeeze)}>
            {props.children}

            {/* Measured as one block so the keyboard scroll keeps the button and its error in view */}
            <View style={{ marginTop: gap(29.5) }} onLayout={(e) => setSubmitBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
              <Animated.View entering={enterAt(310)}>
                <PrimaryButton u={u} label={props.submitLabel} onPress={props.onSubmit} loading={props.loading} />
              </Animated.View>
              {error && (
                <Animated.View
                  entering={FadeInDown.duration(220)}
                  accessibilityLiveRegion="polite"
                  style={[styles.errorRow, { marginTop: u(16), gap: u(10) }]}
                >
                  <Ionicons name="alert-circle" size={Math.max(u(28), 16)} color={LOGIN.error} />
                  <Text maxFontSizeMultiplier={1} style={[styles.error, { fontSize: Math.max(u(24), 14) }]}>{error}</Text>
                </Animated.View>
              )}
            </View>

            <Animated.View entering={enterAt(350)} style={[styles.orRow, { height: u(24), marginTop: gap(38.5), gap: u(26) }]}>
              <View style={[styles.orLine, { height: u(2) }]} />
              <Text maxFontSizeMultiplier={1} style={[styles.or, { fontSize: u(19) }]}>OR</Text>
              <View style={[styles.orLine, { height: u(2) }]} />
            </Animated.View>

            <Animated.View entering={enterAt(390)} style={{ marginTop: gap(38.5) }}>
              <GoogleButton u={u} loading={googleBusy} onPress={continueWithGoogle} />
            </Animated.View>

            <Animated.View entering={enterAt(430)} style={[styles.footerRow, { marginTop: gap(40), gap: u(14) }]}>
              <Text maxFontSizeMultiplier={1} style={[styles.footer, { fontSize: u(23.5) }]}>{props.footerPrompt}</Text>
              <Pressable accessibilityRole="link" hitSlop={{ top: 14, bottom: 14, left: 8, right: 16 }} onPress={props.onFooter}>
                <Text maxFontSizeMultiplier={1} style={[styles.footerAction, { fontSize: u(30) }]}>{props.footerAction}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
      {/* Lifted for the keyboard, the hero would run under the clock */}
      {keyboard && (
        <View pointerEvents="none" style={[styles.abs, { top: 0, left: 0, right: 0, height: insets.top, backgroundColor: LOGIN.heroBg }]} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: LOGIN.heroBg },
  scroll: { flexGrow: 1 },
  abs: { position: "absolute" },
  title: { fontFamily: fonts.bold, color: LOGIN.ink, includeFontPadding: false },
  subtitle: { fontFamily: fonts.regular, color: LOGIN.body, includeFontPadding: false },
  card: { flexGrow: 1, backgroundColor: colors.background },
  errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  error: { flexShrink: 1, fontFamily: fonts.regular, color: LOGIN.error },
  orRow: { flexDirection: "row", alignItems: "center" },
  orLine: { flex: 1, backgroundColor: LOGIN.line },
  or: { fontFamily: fonts.medium, color: LOGIN.or, letterSpacing: 0.5, includeFontPadding: false },
  footerRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center" },
  footer: { fontFamily: fonts.regular, color: LOGIN.body, includeFontPadding: false },
  footerAction: { fontFamily: fonts.medium, color: LOGIN.link, includeFontPadding: false },
}));
