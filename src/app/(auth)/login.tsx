import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import Animated from "react-native-reanimated";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useToast } from "@/components/ui";
import { LOGIN_ART } from "@/features/auth/auth-hero";
import { AuthLayout, enterAt } from "@/features/auth/auth-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthInput, LOGIN, PasswordInput, useRefScale } from "@/features/auth/login-kit";
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
      const auth = await authApi.login({ email: email.trim().toLowerCase(), password });
      await signIn(auth);
      toast(`Welcome back, ${auth.user.fullName.split(" ")[0]}`);
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
      subtitle={"Sign in to continue\nand make messages\nreach further."}
      subtitleBaseline={470}
      // Dev builds only: long-press the title to fill in the test account. Release builds (judges) never see it.
      onTitleLongPress={
        __DEV__
          ? () => {
              setEmail("demo@campaignone.app");
              setPassword("Demo@1234");
              reset();
              toast("Test account filled in");
            }
          : undefined
      }
      submitLabel="Sign in"
      onSubmit={submit}
      loading={loading}
      error={error}
      footerPrompt="Don’t have an account?"
      footerAction="Sign up"
      onFooter={() => router.replace("/signup")}
    >
      <Animated.View entering={enterAt(180)}>
        <AuthInput maxFontSizeMultiplier={1}
          u={u}
          icon="mail-outline"
          placeholder="Email address"
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

      <Animated.View entering={enterAt(270)} style={[styles.forgotRow, { marginTop: u(14.5) }]}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push({ pathname: "/forgot-password", params: email.trim() ? { email: email.trim() } : {} })}>
          <Text maxFontSizeMultiplier={1} style={[styles.forgot, { fontSize: u(23.5), lineHeight: u(30) }]}>Forgot password?</Text>
        </Pressable>
      </Animated.View>
    </AuthLayout>
  );
}

const styles = themed(() => StyleSheet.create({
  forgotRow: { alignItems: "flex-end" },
  forgot: { fontFamily: fonts.medium, color: LOGIN.link, includeFontPadding: false },
}));
