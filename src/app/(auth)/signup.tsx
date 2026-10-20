import { router } from "expo-router";
import { useRef, useState } from "react";
import { TextInput } from "react-native";
import Animated from "react-native-reanimated";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useToast } from "@/components/ui";
import { SIGNUP_ART } from "@/features/auth/auth-hero";
import { AuthLayout, enterAt } from "@/features/auth/auth-layout";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthInput, PasswordInput, useRefScale } from "@/features/auth/login-kit";
import { useLiveErrors } from "@/lib/use-live-errors";

type Field = "fullName" | "email" | "password" | "confirm";

export default function SignupScreen() {
  const u = useRefScale();
  const { signIn } = useAuth();
  const toast = useToast();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [values, setValues] = useState<Record<Field, string>>({ fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Checked live after the first attempt: each message goes away once its field is valid
  const { errors, check, setServerErrors, edited } = useLiveErrors<Field>(() => {
    const errs: Partial<Record<Field, string>> = {};
    if (values.fullName.trim().length < 2) errs.fullName = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errs.email = "Enter a valid email address.";
    if (values.password.length < 8) errs.password = "Use at least 8 characters.";
    if (values.confirm !== values.password) errs.confirm = "Passwords don’t match.";
    return errs;
  });

  async function submit() {
    const { fullName, email, password } = values;
    setError(null);
    if (!check()) return;

    setLoading(true);
    try {
      const auth = await authApi.signup({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password });
      await signIn(auth);
      toast("Account created");
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details && typeof err.details === "object") {
        const d = err.details as Record<string, string[] | undefined>;
        setServerErrors({ fullName: d.fullName?.[0], email: d.email?.[0], password: d.password?.[0] });
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn’t create your account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Typing clears a request failure; field errors update live
  function edit(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    edited(field);
    setError(null);
  }

  return (
    <AuthLayout
      art={SIGNUP_ART}
      cardTop={550}
      title={"Create\naccount"}
      titleBaseline={296}
      subtitle={"Fund the reach that\ngets important messages\nto more people."}
      subtitleBaseline={406}
      submitLabel="Create account"
      onSubmit={submit}
      loading={loading}
      error={error}
      footerPrompt="Already have an account?"
      footerAction="Sign in"
      onFooter={() => router.replace("/login")}
    >
      <Animated.View entering={enterAt(180)}>
        <AuthInput maxFontSizeMultiplier={1}
          u={u}
          icon="person-outline"
          placeholder="Full name"
          value={values.fullName}
          onChangeText={(v) => edit("fullName", v)}
          error={errors.fullName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
      </Animated.View>

      <Animated.View entering={enterAt(210)} style={{ marginTop: u(21.5) }}>
        <AuthInput maxFontSizeMultiplier={1}
          ref={emailRef}
          u={u}
          icon="mail-outline"
          placeholder="Email address"
          value={values.email}
          onChangeText={(v) => edit("email", v)}
          error={errors.email}
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

      <Animated.View entering={enterAt(240)} style={{ marginTop: u(21.5) }}>
        <PasswordInput maxFontSizeMultiplier={1}
          ref={passwordRef}
          u={u}
          placeholder="Password"
          value={values.password}
          onChangeText={(v) => edit("password", v)}
          error={errors.password}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />
      </Animated.View>

      <Animated.View entering={enterAt(270)} style={{ marginTop: u(21.5) }}>
        <PasswordInput maxFontSizeMultiplier={1}
          ref={confirmRef}
          u={u}
          placeholder="Confirm password"
          value={values.confirm}
          onChangeText={(v) => edit("confirm", v)}
          error={errors.confirm}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </Animated.View>
    </AuthLayout>
  );
}
