// Create tab: two ways to start (manual or voice), the five steps ahead, plus saved drafts to resume.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { campaignsApi } from "@/api/campaigns";
import { ApiError } from "@/api/client";
import { useMyCampaigns, useUnreadCount } from "@/api/queries";
import { EmptyState, Screen, Skeleton, Text, useToast } from "@/components/ui";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/auth-provider";
import { SignedOut } from "@/features/auth/signed-out";
import { CreateHero, DraftTile, StepsStrip } from "@/features/create/create-top";
import { colors, radius, spacing, themed } from "@/theme";
import { showAlert } from "@/components/ui/alert-dialog";

export default function CreateTab() {
  const tabSpace = useTabBarSpace();
  const { isSignedIn, user } = useAuth();
  const unread = useUnreadCount();
  const qc = useQueryClient();
  const toast = useToast();
  const drafts = useMyCampaigns("drafts");
  const insets = useSafeAreaInsets();

  const remove = useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => {
      toast("Draft deleted");
      void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't delete the draft.", "error"),
  });
  const confirmDelete = (id: string, title: string | null) =>
    showAlert("Delete this draft?", `"${title || "Untitled draft"}" will be removed for good.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(id) },
    ]);

  if (!isSignedIn) {
    return (
      <Screen safeTop bottomInset={tabSpace}>
        <SignedOut
          title="Start your first campaign"
          body="Create a campaign, get it reviewed, and let backers fund the ads that carry it beyond your own network."
        />
      </Screen>
    );
  }

  const items = drafts.data?.items ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen padded={false} bottomInset={tabSpace} onRefresh={() => drafts.refetch()} refreshing={drafts.isRefetching}>
        <CreateHero
          starting={false}
          onManual={() => router.push({ pathname: "/create/[id]", params: { id: "new" } })}
          onVoice={() => router.push("/create/voice")}
          hasUnread={(unread.data?.count ?? 0) > 0}
          user={user}
        />
        <StepsStrip />

        <View style={styles.draftsHead}>
          <View>
            <Text variant="h2" accessibilityRole="header">
              Your drafts
            </Text>
            <Text variant="bodySm" color={colors.textMuted}>
              Saved automatically as you go.
            </Text>
          </View>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push("/my-campaigns")} style={styles.allLink}>
            <Text variant="title" color={colors.primary} style={{ fontSize: 14 }}>
              All campaigns
            </Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </Pressable>
        </View>
        {drafts.isPending ? (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <Skeleton height={96} round={radius.lg} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState compact icon="document-text-outline" title="No drafts yet" body="Anything you start is saved here, so you can come back to it any time." />
        ) : (
          items.map((d) => (
            <DraftTile
              key={d.id}
              draft={d}
              onResume={() => router.push({ pathname: "/create/[id]", params: { id: d.id } })}
              onDelete={() => confirmDelete(d.id, d.title)}
              deleting={remove.isPending && remove.variables === d.id}
            />
          ))
        )}
      </Screen>
      {/* Solid strip behind the status bar so scrolled content doesn't run under the clock */}
      <View pointerEvents="none" style={[styles.statusBar, { height: insets.top }]} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  draftsHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  allLink: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 40 },
  statusBar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.background },
}));
