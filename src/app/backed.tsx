import { router } from "expo-router";
import { FlatList, StyleSheet } from "react-native";
import { useBacked } from "@/api/queries";
import { EmptyState, ErrorState, LoadingState, StatusPill } from "@/components/ui";
import { openCampaign } from "@/features/campaigns/campaign-card";
import { CampaignListCard } from "@/features/campaigns/campaign-parts";
import { ImpactCard } from "@/features/campaigns/impact-card";
import { compactNumber, money, percent } from "@/lib/format";
import { colors, spacing, themed } from "@/theme";

const HERO_ART = require("../../assets/images/states/impact-hero.png");

export default function BackedScreen() {
  const query = useBacked();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const items = query.data;
  const total = items.reduce((sum, c) => sum + c.myContributionCents, 0);
  // Same per-dollar estimate as receipts and Profile
  const reach = items.reduce((sum, c) => sum + (c.myContributionCents / 100) * c.funding.reachPerDollar, 0);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(c) => c.id}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      ListHeaderComponent={
        items.length > 0 ? (
          <ImpactCard
            art={HERO_ART}
            overline="Your impact"
            value={money(total)}
            caption="put into ads that carry these messages further"
            stats={[
              { icon: "people", value: `~${compactNumber(Math.round(reach))}`, label: "people reached" },
              { icon: "megaphone", value: String(items.length), label: items.length === 1 ? "campaign backed" : "campaigns backed" },
            ]}
          />
        ) : null
      }
      renderItem={({ item, index }) => (
        <CampaignListCard
          title={item.title}
          imageUrl={item.squareImageUrl ?? item.coverImageUrl}
          badge={<StatusPill status={item.status} />}
          progress={item.funding.percentFunded}
          progressLabel={`${money(item.funding.raisedCents)} of ${money(item.funding.goalCents)}`}
          progressValue={percent(item.funding.percentFunded)}
          detail={`You contributed ${money(item.myContributionCents)}`}
          onPress={() => openCampaign(item)}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="heart-outline"
          title="No backed campaigns yet"
          body="Find a message you want more people to see, and help fund its reach."
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
