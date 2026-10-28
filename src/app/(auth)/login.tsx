import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useToast } from "@/components/ui";
import { LOGIN_ART } from "@/features/auth/auth-hero";
import { AuthLayout, enterAt } from "@/features/auth/auth-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthInput, LOGIN, PasswordInput, RoleSwitch, useRefScale, type SignInRole } from "@/features/auth/login-kit";
import { useLiveErrors } from "@/lib/use-live-errors";
import { fonts, themed } from "@/theme";

type Field = "email" | "password";

export default function LoginScreen() {
  const u = useRefScale();
  const { signIn } = useAuth();
  const toast = useToast();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Most people are users; the one admin picks Admin (no Google, sign-up or password reset there)
  const [role, setRole] = useState<SignInRole>("user");
  const isAdmin = role === "admin";
  // After the entrance, toggled rows animate on their own instead of waiting for the stagger
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, []);
  // Checked live after the first attempt: each message goes away once its field is valid
  const { errors: fieldErrors, check, reset } = useLiveErrors<Field>(() => ({
    ...(!/^\S+@\S+\.\S+$/.test(email.trim()) && { email: "Enter a valid email address." }),
    ...(!password && { password: "Enter your password." }),
  }));

  async function submit() {
    setError(null);
    if (!check()) return;

    setLoading(true);
    try {
      const auth = await authApi.login({ email: email.trim().toLowerCase(), password, role });
      await signIn(auth);
      toast(isAdmin ? "Signed in as admin" : `Welcome back, ${auth.user.fullName.split(" ")[0]}`);
      // The auth screens close themselves once signed in (protected route)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Typing clears a sign-in failure; field errors update live
  function edit(field: Field, value: string) {
    (field === "email" ? setEmail : setPassword)(value);
    setError(null);
  }

  return (
    <AuthLayout
      art={LOGIN_ART}
      cardTop={694}
      title={"Welcome\nback"}
      titleBaseline={354}
      subtitle={isAdmin ? "Admin sign-in to\nreview campaigns\nand see stats." : "Sign in to continue\nand make messages\nreach further."}
      subtitleBaseline={470}
      // Dev builds only: long-press the title to fill in the test account. Release builds (judges) never see it.
      onTitleLongPress={
        __DEV__
          ? () => {
              setEmail(isAdmin ? "humanity-admin@gmail.com" : "demo@campaignone.app");
              setPassword(isAdmin ? "Humanity@123" : "Demo@1234");
              reset();
              toast(isAdmin ? "Admin account filled in" : "Test account filled in");
            }
          : undefined
      }
      submitLabel={isAdmin ? "Sign in as admin" : "Sign in"}
      onSubmit={submit}
      loading={loading}
      error={error}
      alternatives={!isAdmin}
      footerPrompt="Don’t have an account?"
      footerAction="Sign up"
      onFooter={() => router.replace("/signup")}
    >
      <Animated.View entering={enterAt(150)} style={{ marginBottom: u(21.5) }}>
        <RoleSwitch
          u={u}
          value={role}
          onChange={(r) => {
            setRole(r);
            setError(null);
          }}
        />
      </Animated.View>

      <Animated.View entering={enterAt(180)}>
        <AuthInput maxFontSizeMultiplier={1}
          u={u}
          icon={isAdmin ? "shield-outline" : "mail-outline"}
          placeholder={isAdmin ? "Admin email" : "Email address"}
          value={email}
          onChangeText={(v) => edit("email", v)}
          error={fieldErrors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
      </Animated.View>

      <Animated.View entering={enterAt(230)} style={{ marginTop: u(21.5) }}>
        <PasswordInput maxFontSizeMultiplier={1}
          ref={passwordRef}
          u={u}
          placeholder="Password"
          value={password}
          onChangeText={(v) => edit("password", v)}
          error={fieldErrors.password}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </Animated.View>

      {/* The admin account is managed on the server, so it has no self-service reset */}
      {!isAdmin && (
        <Animated.View exiting={FadeOutUp.duration(180)}>
          <Animated.View entering={settled ? FadeInDown.duration(260) : enterAt(270)} style={[styles.forgotRow, { marginTop: u(14.5) }]}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push({ pathname: "/forgot-password", params: email.trim() ? { email: email.trim() } : {} })}>
              <Text maxFontSizeMultiplier={1} style={[styles.forgot, { fontSize: u(23.5), lineHeight: u(30) }]}>Forgot password?</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </AuthLayout>
  );
}

const styles = themed(() => StyleSheet.create({
  forgotRow: { alignItems: "flex-end" },
  forgot: { fontFamily: fonts.medium, color: LOGIN.link, includeFontPadding: false },
}));
