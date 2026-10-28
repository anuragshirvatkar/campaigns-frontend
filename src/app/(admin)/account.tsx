// The admin's account: who is signed in, queue totals, theme, and log out.
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdminAnalytics, useAdminCampaigns } from "@/api/queries";
import { Button, Divider, ListRow, Screen, Text } from "@/components/ui";
import { showAlert } from "@/components/ui/alert-dialog";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/auth-provider";
import { heroTop, ProfileHero } from "@/features/profile/profile-hero";
import { ThemePicker } from "@/features/settings/theme-picker";
import { colors, spacing, themed } from "@/theme";

export default function AdminAccountScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const counts = useAdminCampaigns("pending").data?.counts;
  const stats = useAdminAnalytics("30").data;

  return (
    <View style={{ flex: 1 }}>
      <Screen padded={false} bottomInset={tabSpace}>
        <ProfileHero
          name={user?.fullName ?? "Admin"}
          email={user?.email ?? ""}
          avatarUrl={user?.avatarUrl}
          showSettings={false}
          stats={[
            { value: String(counts?.pending ?? "–"), label: "Pending", onPress: () => router.navigate("/review") },
            { value: String(counts?.approved ?? "–"), label: "Approved", onPress: () => router.navigate("/review") },
            { value: String(stats?.allTime.users ?? "–"), label: "Users", onPress: () => router.navigate("/analytics") },
          ]}
        />
        <View style={styles.body}>
          <Text variant="overline" color={colors.textMuted} style={styles.groupLabel}>
            Admin tools
          </Text>
          <ListRow icon="file-tray-full-outline" title="Submissions" subtitle="Approve, ask for changes or reject" onPress={() => router.navigate("/review")} />
          <ListRow
            icon="stats-chart-outline"
            title="Platform analytics"
            subtitle="Money raised, users, delivery and more"
            tint={colors.teal}
            tintBg={colors.tealSoft}
            onPress={() => router.navigate("/analytics")}
          />

          <Text variant="overline" color={colors.textMuted} style={styles.groupLabel}>
            Appearance
          </Text>
          <ThemePicker />


          <Divider style={{ marginVertical: spacing.lg }} />
          <Button
            label="Log out"
            variant="danger"
            icon="log-out-outline"
            onPress={() =>
              showAlert("Log out of admin?", "You can sign back in as admin any time.", [
                { text: "Cancel", style: "cancel" },
                { text: "Log out", style: "destructive", onPress: () => void signOut() },
              ])
            }
          />
        </View>
      </Screen>
      <View pointerEvents="none" style={[styles.statusBar, { height: insets.top }]} />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    body: { paddingHorizontal: spacing.xl },
    statusBar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: heroTop() },
    groupLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  }),
);
