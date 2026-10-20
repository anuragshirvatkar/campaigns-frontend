import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useCampaignFeed, useConfig, useUnreadCount } from "@/api/queries";
import { Button, EmptyState, ErrorState, Screen, Text } from "@/components/ui";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/auth-provider";
import { FeaturedRowSkeleton, HOME, HowItWorks } from "@/features/home/home-parts";
import { CampaignTile, HomeHeader, HomeHero, ReachPanel, useHomeScale } from "@/features/home/home-top";
import { colors, fonts, spacing, themed, dk } from "@/theme";
import { Appear } from "@/components/ui/motion";

const enter = (delay: number) => FadeInDown.duration(450).delay(delay);

export default function HomeScreen() {
  const { user, isSignedIn } = useAuth();
  const config = useConfig();
  const unread = useUnreadCount();
  const featured = useCampaignFeed({ featured: true, sort: "most_funded" });
  const feed = useCampaignFeed({ sort: "newest" });

  const featuredItems = featured.data?.pages.flatMap((p) => p.items) ?? [];
  const featuredIds = new Set(featuredItems.map((c) => c.id));
  const latestItems = (feed.data?.pages.flatMap((p) => p.items) ?? []).filter((c) => !featuredIds.has(c.id));
  const u = useHomeScale();
  const tabSpace = useTabBarSpace();
  const hasUnread = (unread.data?.count ?? 0) > 0;

  const refresh = () => {
    void featured.refetch();
    void feed.refetch();
    void config.refetch();
  };

  return (
    <Screen
      safeTop
      bottomInset={tabSpace}
      onRefresh={refresh}
      refreshing={feed.isRefetching}
      contentContainerStyle={{ paddingHorizontal: u(22) }}
    >
      <HomeHeader u={u} hasUnread={hasUnread} user={isSignedIn && user ? user : null} />
      <HomeHero u={u} />
      <ReachPanel u={u} perDollar={config.data?.reach.reachPerDollar} />

      <View style={[styles.separator, { marginTop: u(34) }]} />

      {/* How it works */}
      <Animated.View entering={enter(160)} style={{ marginTop: u(34) }}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { fontSize: u(30) }]}>
          How it works
        </Text>
        <Text style={styles.sectionSub}>From creator to community, in 3 simple steps.</Text>
        <View style={styles.stepsPanel}>
          <HowItWorks />
        </View>
      </Animated.View>

      {/* Featured */}
      <Animated.View entering={enter(200)} style={{ marginTop: u(56) }}>
        <SectionTitle title="Featured Campaigns" action="See all" onAction={() => router.navigate("/explore")} size={u(30)} />
        <View style={[styles.list, { gap: u(14) }]}>
          {featured.isPending ? (
            <>
              <FeaturedRowSkeleton />
              <FeaturedRowSkeleton />
            </>
          ) : featured.isError ? (
            <ErrorState compact error={featured.error} onRetry={() => featured.refetch()} />
          ) : featuredItems.length === 0 ? (
            <Text style={styles.muted}>No featured campaigns right now.</Text>
          ) : (
            featuredItems.map((c, i) => (
              <Appear key={c.id} index={i}>
                <CampaignTile u={u} campaign={c} />
              </Appear>
            ))
          )}
        </View>
      </Animated.View>

      {/* Latest */}
      <View style={{ marginTop: u(56) }}>
        <SectionTitle title="Latest Campaigns" size={u(30)} />
        <View style={styles.list}>
          {feed.isPending ? (
            <FeaturedRowSkeleton />
          ) : feed.isError ? (
            <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
          ) : latestItems.length === 0 && featuredItems.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="No campaigns yet"
              body="Be the first to start one."
              actionLabel="Start a campaign"
              onAction={() => router.navigate("/create")}
            />
          ) : (
            <>
              {latestItems.map((c, i) => (
                <Appear key={c.id} index={i + 2}>
                  <CampaignTile u={u} campaign={c} />
                </Appear>
              ))}
              {feed.hasNextPage && (
                <Button label="Load more" variant="secondary" loading={feed.isFetchingNextPage} onPress={() => feed.fetchNextPage()} />
              )}
            </>
          )}
        </View>
      </View>

    </Screen>
  );
}

function SectionTitle({ title, action, onAction, size }: { title: string; action?: string; onAction?: () => void; size: number }) {
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { fontSize: size }]}>
        {title}
      </Text>
      {action && onAction && (
        <Pressable accessibilityRole="link" hitSlop={10} onPress={onAction} style={styles.seeAll}>
          <Text style={styles.seeAllText}>{action}</Text>
          <Ionicons name="arrow-forward" size={15} color={HOME.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  separator: { height: 1, backgroundColor: colors.divider },
  stepsPanel: { backgroundColor: dk("#F7F6FE", "#16152D"), borderRadius: 24, padding: spacing.lg },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 20, color: HOME.ink },
  sectionSub: { fontFamily: fonts.regular, fontSize: 14, color: HOME.body, marginTop: 2, marginBottom: spacing.lg },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  seeAllText: { fontFamily: fonts.semibold, fontSize: 14, color: HOME.accent },
  list: { gap: spacing.md },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: HOME.body },

}));
