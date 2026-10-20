import { router } from "expo-router";
import { FlatList, StyleSheet } from "react-native";
import { useFollowing } from "@/api/queries";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { FollowedCampaignCard } from "@/features/campaigns/followed-card";
import { colors, spacing, themed } from "@/theme";

export default function FollowingScreen() {
  const query = useFollowing();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={query.data}
      keyExtractor={(c) => c.id}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      renderItem={({ item, index }) => <FollowedCampaignCard c={item} />}
      ListEmptyComponent={
        <EmptyState
          icon="notifications-outline"
          title="Not following anything yet"
          body="Tap Follow on any campaign to get its milestones and updates here."
          actionLabel="Explore campaigns"
          onAction={() => router.navigate("/explore")}
        />
      }
    />
  );
}

const styles = themed(() =>
  StyleSheet.create({
    list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.huge },
  }),
);
