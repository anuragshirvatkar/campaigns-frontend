import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBacked } from "@/api/queries";
import { Button, Divider, ListRow, Screen, Text } from "@/components/ui";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { meQueryKey, useAuth } from "@/features/auth/auth-provider";
import { SignedOut } from "@/features/auth/signed-out";
import { INFO_GROUPS } from "@/features/info/content";
import { heroTop, ProfileHero } from "@/features/profile/profile-hero";
import { compactNumber, money } from "@/lib/format";
import type { IconName } from "@/lib/labels";
import { colors, spacing, themed } from "@/theme";
import { showAlert } from "@/components/ui/alert-dialog";

const HELP_ICONS: Record<string, IconName> = {
  "how-it-works": "bulb-outline",
  "help-faq": "help-buoy-outline",
  "about-legal": "information-circle-outline",
};

export default function ProfileScreen() {
  const tabSpace = useTabBarSpace();
  const { isSignedIn, user, signOut } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const backed = useBacked();

  if (!isSignedIn) {
    return (
      <Screen safeTop bottomInset={tabSpace}>
        <SignedOut
          title="Your Campaigns account"
          body="See campaigns you’ve created and backed, your payments and settings. Browsing never needs an account."
        >
          <HelpLinks />
        </SignedOut>
      </Screen>
    );
  }

  // Impact: what you put in, and roughly how many people that buys (same per-dollar estimate as receipts)
  const items = backed.data ?? [];
  const contributedCents = items.reduce((sum, b) => sum + b.myContributionCents, 0);
  const reach = items.reduce((sum, b) => sum + (b.myContributionCents / 100) * b.funding.reachPerDollar, 0);
  const loading = backed.isPending;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        padded={false}
        bottomInset={tabSpace}
        onRefresh={() => {
          void qc.invalidateQueries({ queryKey: meQueryKey });
          void backed.refetch();
        }}
      >
        <ProfileHero
          name={user?.fullName ?? " "}
          email={user?.email ?? ""}
          avatarUrl={user?.avatarUrl}
          stats={[
            { value: loading ? "–" : money(contributedCents), label: "Contributed", onPress: () => router.push("/payments") },
            {
              value: loading ? "–" : `~${compactNumber(Math.round(reach))}`,
              label: "People reached",
              onPress: () => router.push("/backed"),
            },
            { value: String(user?.counts?.createdCount ?? "–"), label: "Created", onPress: () => router.push("/my-campaigns") },
          ]}
        />
        <View style={styles.body}>
          <Text variant="overline" color={colors.textMuted} style={styles.groupLabel}>
            Your activity
          </Text>
          <ListRow
            icon="megaphone-outline"
            title="Created campaigns"
            subtitle="Drafts, reviews, funding and reports"
            onPress={() => router.push("/my-campaigns")}
          />
          <ListRow
            icon="heart-outline"
            title="Backed campaigns"
            subtitle="Campaigns you've helped amplify"
            tint={colors.coral}
            tintBg={colors.coralSoft}
            onPress={() => router.push("/backed")}
          />
          <ListRow
            icon="notifications-outline"
            title="Following"
            subtitle="Campaigns you get updates from"
            tint={colors.teal}
            tintBg={colors.tealSoft}
            onPress={() => router.push("/following")}
          />
          <ListRow
            icon="receipt-outline"
            title="Payment history"
            subtitle="Receipts and payment status"
            tint={colors.blue}
            tintBg={colors.blueSoft}
            onPress={() => router.push("/payments")}
          />

          <HelpLinks />

          <Divider style={{ marginVertical: spacing.lg }} />
          <Button
            label="Log out"
            variant="danger"
            icon="log-out-outline"
            onPress={() =>
              showAlert("Log out?", "You can log back in any time.", [
                { text: "Cancel", style: "cancel" },
                { text: "Log out", style: "destructive", onPress: () => void signOut() },
              ])
            }
          />
        </View>
      </Screen>
      {/* Lavender strip behind the status bar, matching the top of the header */}
      <View pointerEvents="none" style={[styles.statusBar, { height: insets.top }]} />
    </View>
  );
}

function HelpLinks() {
  return (
    <>
      <Text variant="overline" color={colors.textMuted} style={styles.groupLabel}>
        Help & information
      </Text>
      {INFO_GROUPS.map((g) => (
        <ListRow
          key={g.key}
          icon={HELP_ICONS[g.key] ?? "document-outline"}
          title={g.title}
          tint={colors.textMuted}
          tintBg={colors.surface}
          onPress={() => router.push({ pathname: "/info/[page]", params: { page: g.key } })}
        />
      ))}
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl },
  statusBar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: heroTop() },
  groupLabel: { marginTop: spacing.xl, marginBottom: spacing.xs },
}));
