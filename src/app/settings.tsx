import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button, Card, Note, Screen, SectionHeader, Text, TextField, useToast } from "@/components/ui";
import { meQueryKey, useAuth } from "@/features/auth/auth-provider";
import { PasswordField } from "@/features/auth/password-field";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed, type ThemeMode } from "@/theme";
import { useTheme } from "@/theme/theme-provider";
import { NotificationSettings } from "@/features/notifications/notification-settings";

export default function SettingsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const saveName = useMutation({
    mutationFn: () => authApi.updateMe({ fullName: fullName.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: meQueryKey });
      toast("Name updated");
    },
  });

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      toast("Password changed");
    },
  });

  return (
    <Screen>
      <SectionHeader overline="Appearance" title="Theme" />
      <ThemePicker />

      <View style={{ height: spacing.xxl }} />
      <SectionHeader overline="Profile" title="Account details" />
      <Card style={{ gap: spacing.lg }}>
        <TextField
          label="Full name"
          value={fullName}
          onChangeText={(v) => {
            setFullName(v);
            saveName.reset(); // a failed save message goes once they edit
          }}
          hint="Shown to others as first name and initial, e.g. “Ananya R.”"
        />
        <View style={{ gap: 4 }}>
          <Text variant="title" style={{ fontSize: 14 }}>
            Email
          </Text>
          <Text variant="body" color={colors.textMuted}>
            {user?.email}
          </Text>
        </View>
        {saveName.isError && <Note tone="danger">{saveName.error instanceof ApiError ? saveName.error.message : "Couldn't save."}</Note>}
        <Button
          label="Save name"
          variant="secondary"
          disabled={!fullName.trim() || fullName.trim() === user?.fullName}
          loading={saveName.isPending}
          onPress={() => saveName.mutate()}
        />
      </Card>

      <View style={{ height: spacing.xxl }} />
      <SectionHeader overline="Security" title="Change password" />
      <Card style={{ gap: spacing.lg }}>
        <PasswordField
          label="Current password"
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            changePassword.reset();
          }}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          value={next}
          onChangeText={(v) => {
            setNext(v);
            changePassword.reset();
          }}
          showStrength
          autoComplete="new-password"
        />
        {changePassword.isError && (
          <Note tone="danger">
            {changePassword.error instanceof ApiError ? changePassword.error.message : "Couldn't change the password."}
          </Note>
        )}
        <Button
          label="Change password"
          disabled={!current || next.length < 8}
          loading={changePassword.isPending}
          onPress={() => changePassword.mutate()}
        />
        <Text variant="caption">You’ll get a security notification in Activity whenever your password changes.</Text>
      </Card>

      <View style={{ height: spacing.xxl }} />
      <SectionHeader overline="Notifications" title="What you'll hear about" />
      <NotificationSettings />
    </Screen>
  );
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: "system", label: "System", icon: "phone-portrait-outline" },
  { mode: "light", label: "Light", icon: "sunny-outline" },
  { mode: "dark", label: "Dark", icon: "moon-outline" },
];

function ThemePicker() {
  const { mode, setMode } = useTheme();
  return (
    <View>
      <View style={styles.themeRow} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((o) => {
          const on = o.mode === mode;
          return (
            <Pressable
              key={o.mode}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => !on && setMode(o.mode)}
              style={({ pressed }) => [styles.themeOption, on && styles.themeOptionOn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name={o.icon} size={22} color={on ? colors.primary : colors.textMuted} />
              <Text style={[styles.themeLabel, { color: on ? colors.primary : colors.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" style={{ marginTop: spacing.sm }}>
        System follows your phone’s dark mode setting.
      </Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    themeRow: { flexDirection: "row", gap: spacing.sm },
    themeOption: {
      flex: 1,
      minHeight: 76,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    themeOptionOn: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
    },
    themeLabel: { fontFamily: fonts.medium, fontSize: 14 },
  }),
);
