import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button, Note, Screen, Text, TextField, useToast } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { PasswordField } from "@/features/auth/password-field";
import { useLiveErrors } from "@/lib/use-live-errors";
import { colors, radius, spacing, themed } from "@/theme";

const RESEND_AFTER_SEC = 30;

/** Two steps: email → 6-digit code from the email + a new password, then straight into the app. */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(params.email ?? "");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const cleanEmail = email.trim().toLowerCase();
  // Field errors show after the first try and clear live once the value is valid
  const emailCheck = useLiveErrors<"email">(() =>
    /^\S+@\S+\.\S+$/.test(cleanEmail) ? {} : { email: "Enter a valid email address." },
  );
  const resetCheck = useLiveErrors<"code" | "password">(() => ({
    ...(!/^\d{6}$/.test(code) && { code: "Enter the 6-digit code from the email." }),
    ...(password.length < 8 && { password: "Use at least 8 characters." }),
  }));

  async function sendCode() {
    setError(null);
    if (!emailCheck.check()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: cleanEmail });
      setStep("reset");
      setCooldown(RESEND_AFTER_SEC);
      toast("Code sent. Check your email");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setError(null);
    if (!resetCheck.check()) return;
    setLoading(true);
    try {
      const auth = await authApi.resetPassword({ email: cleanEmail, code, newPassword: password });
      await signIn(auth);
      toast("Password reset. You're signed in");
      // The auth screens close themselves once signed in (protected route)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset the password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen safeTop>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.icon}>
        <Ionicons name={step === "email" ? "key-outline" : "mail-open-outline"} size={30} color={colors.primary} />
      </View>
      <Text variant="h1" style={{ marginTop: spacing.lg }}>
        {step === "email" ? "Forgot your password?" : "Check your email"}
      </Text>
      <Text variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
        {step === "email"
          ? "Enter the email you signed up with. We'll send you a 6-digit code to set a new password."
          : `If ${cleanEmail} has an account, a 6-digit code is on its way. It expires in 15 minutes.`}
      </Text>

      {step === "email" ? (
        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailCheck.errors.email}
            returnKeyType="send"
            onSubmitEditing={sendCode}
          />
          {error && <Note tone="danger">{error}</Note>}
          <Button label="Send code" loading={loading} onPress={sendCode} />
        </View>
      ) : (
        <Animated.View entering={FadeInRight.duration(250)} style={styles.form}>
          <TextField
            label="Code"
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            error={resetCheck.errors.code}
          />
          <PasswordField
            label="New password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            showStrength
            error={resetCheck.errors.password}
            autoComplete="new-password"
            onSubmitEditing={reset}
          />
          {error && <Note tone="danger">{error}</Note>}
          <Button label="Reset password" loading={loading} onPress={reset} />
          <View style={styles.links}>
            <Pressable accessibilityRole="button" hitSlop={10} disabled={cooldown > 0 || loading} onPress={sendCode}>
              <Text variant="title" color={cooldown > 0 ? colors.textSubtle : colors.primary}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                setStep("email");
                setCode("");
                setError(null);
                resetCheck.reset();
              }}
            >
              <Text variant="title" color={colors.primary}>
                Change email
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    back: { width: 44, height: 44, justifyContent: "center", marginLeft: -6, marginBottom: spacing.lg },
    icon: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    form: { gap: spacing.lg, marginTop: spacing.xxl },
    links: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  }),
);
