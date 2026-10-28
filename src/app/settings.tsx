import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Switch, View } from "react-native";
import { Image } from "expo-image";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button, Card, Note, Screen, SectionHeader, Text, TextField, useToast } from "@/components/ui";
import { meQueryKey, useAuth } from "@/features/auth/auth-provider";
import { SAM_IMAGE } from "@/features/assistant/sam";
import type { Me } from "@/api/types";
import { PasswordField } from "@/features/auth/password-field";
import { colors, spacing } from "@/theme";
import { ThemePicker } from "@/features/settings/theme-picker";
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
      <SectionHeader overline="Assistant" title="Sam, your voice guide" />
      <SamSettings />

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
          hint="Shown to others as first name and initial, e.g. “Emily C.”"
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

/** Turn Sam on or off, or watch his intro tour again. */
function SamSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  // The switch flips at once; the rest of the app (Sam appearing or leaving) follows a moment later,
  // so the toggle itself never waits on that work
  const [on, setOn] = useState(user?.assistantEnabled ?? true);
  const update = (patch: { assistantEnabled?: boolean; appIntroduced?: boolean }) => {
    setTimeout(() => qc.setQueryData<Me>(meQueryKey, (me) => (me ? { ...me, ...patch } : me)), 250);
    void authApi.updateMe(patch).catch(() => void qc.invalidateQueries({ queryKey: meQueryKey }));
  };
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Image source={SAM_IMAGE} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text variant="title">Show Sam</Text>
          <Text variant="caption">Tap him to talk, double-tap to type. He can open screens, find campaigns and help fill your draft.</Text>
        </View>
        <Switch
          value={on}
          onValueChange={(v) => {
            setOn(v);
            update({ assistantEnabled: v });
          }}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Show Sam"
        />
      </View>
      {on && <Button label="Show Sam's hello again" variant="secondary" size="sm" icon="play-circle-outline" onPress={() => update({ appIntroduced: false })} />}
    </Card>
  );
}
