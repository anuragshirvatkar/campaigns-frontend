// The admin's review queue: submitted campaigns to approve, send back for changes or reject,
// with tabs for what's pending and what was already decided.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdminCampaigns } from "@/api/queries";
import type { AdminTab } from "@/api/types";
import { EmptyState, ErrorState, Skeleton, StatusBarShade, Text } from "@/components/ui";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { AdminHeader, QueueRow, SegmentTabs } from "@/features/admin/admin-parts";
import { colors, fonts, radius, spacing, themed } from "@/theme";

const EMPTY: Record<AdminTab, { title: string; body: string }> = {
  pending: { title: "You're all caught up", body: "New submissions appear here. You'll get a notification when one arrives." },
  changes_requested: { title: "Nothing sent back", body: "Campaigns you ask to be changed wait here until the creator resubmits." },
  approved: { title: "No approved campaigns yet", body: "Campaigns you approve go live for funding and show up here." },
  rejected: { title: "Nothing rejected", body: "Campaigns that can't run on the platform are listed here." },
};

export default function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [tab, setTab] = useState<AdminTab>("pending");
  const query = useAdminCampaigns(tab);
  // Counts for every tab come with any list; keep showing the last ones while a tab loads
  const pendingQuery = useAdminCampaigns("pending");
  const counts = query.data?.counts ?? pendingQuery.data?.counts;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AdminHeader title="Submissions" />
      <View style={styles.tabs}>
        <SegmentTabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "pending", label: "Pending", count: counts?.pending },
            { key: "changes_requested", label: "Revision", count: counts?.changes_requested },
            { key: "approved", label: "Approved", count: counts?.approved },
            { key: "rejected", label: "Rejected", count: counts?.rejected },
          ]}
        />
      </View>

      {query.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton}>
              <Skeleton width={72} height={72} round={radius.md} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="40%" height={10} />
                <Skeleton width="85%" height={16} />
                <Skeleton width="55%" height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          // Re-keyed per tab so the rows animate in when switching
          key={tab}
          data={query.data.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabSpace + spacing.xl }]}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          ListHeaderComponent={tab === "pending" && query.data.items.length > 0 ? <QueueBanner count={query.data.items.length} /> : null}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(260).delay(Math.min(index, 6) * 45)}>
              <QueueRow c={item} tab={tab} />
            </Animated.View>
          )}
          ListEmptyComponent={
            <Animated.View entering={FadeIn.duration(250)}>
              <EmptyState compact icon={tab === "pending" ? "checkmark-done-outline" : "folder-open-outline"} title={EMPTY[tab].title} body={EMPTY[tab].body} />
            </Animated.View>
          }
        />
      )}
      <StatusBarShade />
    </View>
  );
}

/** "3 campaigns waiting, oldest first" over the pending list. */
function QueueBanner({ count }: { count: number }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.banner}>
      <View style={styles.bannerIcon}>
        <Ionicons name="file-tray-full" size={20} color={colors.textOnDark} />
      </View>
      <Text style={[styles.bannerTitle, { flex: 1 }]}>
        {count} {count === 1 ? "campaign" : "campaigns"} waiting
      </Text>
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    tabs: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
    list: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md },
    skeleton: { flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.primaryTint,
      borderWidth: 1,
      borderColor: colors.primarySoft,
    },
    bannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    bannerTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  }),
);
