import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SectionList, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { engageApi } from "@/api/engage";
import { keys, useFollowing, useNotifications, useUnreadCount } from "@/api/queries";
import type { Notification, NotificationType, Page } from "@/api/types";
import { EmptyState, ErrorState, LoadingState, Screen, Text } from "@/components/ui";
import { FilterMat, MoreToggle, Pill, PillRow, useFilterMenu, useNarrowFilters } from "@/components/ui/filter-mat";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/auth-provider";
import { SignedOut } from "@/features/auth/signed-out";
import { openCampaign } from "@/features/campaigns/campaign-card";
import { FollowedCampaignCard } from "@/features/campaigns/followed-card";
import { HomeHeader, useHomeScale } from "@/features/home/home-top";
import { timeAgo } from "@/lib/format";
import { feedHeadline, NOTIFICATION_ICON, TONE } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";

type Filter = "all" | "milestones" | "updates" | "payments" | "creator";

const FILTERS: { value: Filter; label: string; types?: NotificationType[] }[] = [
  { value: "all", label: "All" },
  {
    value: "milestones",
    label: "Milestones",
    types: [
      "funding_milestone",
      "deadline_approaching",
      "funding_ended",
      "campaign_live",
      "promotion_started",
      "distribution_progress",
      "campaign_completed",
      "report_available",
    ],
  },
  { value: "updates", label: "Updates", types: ["campaign_update", "new_comment"] },
  { value: "payments", label: "Payments", types: ["contribution_succeeded", "contribution_failed"] },
  {
    value: "creator",
    label: "Account",
    types: ["submission_received", "campaign_approved", "campaign_changes_requested", "campaign_rejected", "security_alert"],
  },
];

export default function ActivityScreen() {
  const u = useHomeScale();
  const { user } = useAuth();
  const unread = useUnreadCount();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { isSignedIn } = useAuth();
  const [tab, setTab] = useState<"notifications" | "following">("notifications");

  if (!isSignedIn) {
    return (
      <Screen safeTop bottomInset={tabSpace}>
        <SignedOut
          title="Stay on top of campaigns"
          body="Log in to get funding milestones, creator updates, payment confirmations and progress on campaigns you follow."
        />
      </Screen>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.head}>
        <View style={{ marginHorizontal: -spacing.xl + u(22) }}>
          <HomeHeader u={u} title="Activity" showBell={false} hasUnread={(unread.data?.count ?? 0) > 0} user={user} />
        </View>
        <View style={styles.segment} accessibilityRole="tablist">
          {(["notifications", "following"] as const).map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={[styles.segmentItem, tab === t && styles.segmentActive]}
            >
              <Text variant="title" color={tab === t ? colors.primary : colors.textMuted}>
                {t === "notifications" ? "Notifications" : "Following"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {tab === "notifications" ? <NotificationsList /> : <FollowingList />}
    </View>
  );
}

function NotificationsList() {
  const tabSpace = useTabBarSpace();
  const qc = useQueryClient();
  const query = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const rowRef = useRef<View>(null);
  const { rootRef, menu, shownMenu, anchor, toggle, close } = useFilterMenu<"filters">({ filters: rowRef });
  // All, Milestones, Updates up front; a filter picked from More takes the last slot
  const narrow = useNarrowFilters([{ label: "All" }, { label: "Milestones" }, { label: "Updates" }, { label: "More", icon: true }]);
  const front: Filter[] = narrow
    ? ["all", filter === "all" ? "milestones" : filter]
    : ["all", "milestones", filter === "payments" || filter === "creator" ? filter : "updates"];
  const hidden = FILTERS.filter((f) => !front.includes(f.value));
  const pick = (f: Filter) => {
    setFilter(f);
    close();
  };
  const filterRow = (
    <PillRow>
      {front.map((v) => (
        <Pill key={v} label={FILTERS.find((f) => f.value === v)!.label} selected={filter === v} onPress={() => pick(v)} />
      ))}
      <MoreToggle open={menu === "filters"} onPress={() => toggle("filters")} />
    </PillRow>
  );
  const all = query.data?.pages.flatMap((p) => p.items) ?? [];
  const types = FILTERS.find((f) => f.value === filter)?.types;
  const items = types ? all.filter((n) => types.includes(n.type)) : all;
  const sections = byDay(items);
  const hasUnread = all.some((n) => !n.readAt);

  const markAll = useMutation({
    mutationFn: engageApi.markAllRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.notifications });
      void qc.invalidateQueries({ queryKey: keys.unread });
    },
  });

  const open = (n: Notification) => {
    if (!n.readAt) {
      // Mark read optimistically so the dot disappears immediately
      qc.setQueryData<{ pages: Page<Notification>[]; pageParams: number[] }>(
        keys.notifications,
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              items: p.items.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)),
            })),
          },
      );
      engageApi
        .markRead(n.id)
        .then(() => qc.invalidateQueries({ queryKey: keys.unread }))
        .catch(() => {});
    }
    if (n.contributionId) {
      router.push({ pathname: "/receipt/[id]", params: { id: n.contributionId } });
    } else if (n.type === "report_available" && n.campaign) {
      router.push({ pathname: "/campaign/[id]/report", params: { id: n.campaign.slug ?? n.campaign.id } });
    } else if (n.campaign) {
      openCampaign(n.campaign);
    }
  };

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1 }}>
      <SectionList
        onScrollBeginDrag={close}
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingBottom: spacing.huge + tabSpace }}
        ItemSeparatorComponent={() => <View style={styles.hairline} />}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => {
          void query.refetch();
          void qc.invalidateQueries({ queryKey: keys.unread });
        }}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        ListHeaderComponent={
          <View ref={rowRef} collapsable={false} style={styles.listHead}>
            {filterRow}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text variant="title" style={{ fontSize: 15 }}>
              {section.title}
            </Text>
            {/* "Mark all read" lives on the first group, so it costs no row of its own */}
            {hasUnread && section === sections[0] && (
              <Pressable accessibilityRole="button" onPress={() => markAll.mutate()} hitSlop={10} style={styles.markAll}>
                <Ionicons name="checkmark-done" size={17} color={colors.primary} />
                <Text variant="title" color={colors.primary} style={{ fontSize: 14 }}>
                  Mark all read
                </Text>
              </Pressable>
            )}
          </View>
        )}
        renderItem={({ item, index }) => <NotificationItem n={item} onPress={() => open(item)} />}
        ListEmptyComponent={
          <EmptyState
            compact
            icon="notifications-off-outline"
            title={filter === "all" ? "No notifications yet" : "Nothing here"}
            body={
              filter === "all" ? "Back or follow a campaign and its milestones will show up here." : "No notifications of this kind yet."
            }
            actionLabel={filter === "all" ? "Explore campaigns" : undefined}
            onAction={() => router.navigate("/explore")}
          />
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
      />
      {shownMenu && anchor && (
        <FilterMat open={menu === shownMenu} anchor={anchor} onClose={close} row={filterRow}>
          <PillRow>
            {hidden.map((f) => (
              <Pill key={f.value} label={f.label} selected={filter === f.value} onPress={() => pick(f.value)} />
            ))}
          </PillRow>
        </FilterMat>
      )}
    </View>
  );
}

const DAY = 86_400_000;

/** Which feed group a timestamp falls in, by calendar day. */
function dayGroup(iso: string) {
  const today = new Date().setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  if (t >= today) return "Today";
  if (t >= today - DAY) return "Yesterday";
  if (t >= today - 6 * DAY) return "This week";
  return "Earlier";
}

/** Row time that agrees with its group: "3h" today, then a clock time, a weekday, or a date. */
function feedTime(iso: string) {
  const d = new Date(iso);
  switch (dayGroup(iso)) {
    case "Today":
      return timeAgo(iso).replace(" ago", "");
    case "Yesterday":
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    case "This week":
      return d.toLocaleDateString("en-US", { weekday: "short" });
    default:
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
}

/** Groups the feed under Today / Yesterday / This week / Earlier, keeping newest first. */
function byDay(items: Notification[]) {
  const label = dayGroup;
  const sections: { title: string; data: Notification[] }[] = [];
  for (const n of items) {
    const title = label(n.createdAt);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(n);
    else sections.push({ title, data: [n] });
  }
  return sections;
}

/**
 * One feed row: the campaign image with a small event badge (or just the event icon when there is no campaign),
 * then the campaign name and time, the short headline, and the message.
 */
function NotificationItem({ n, onPress }: { n: Notification; onPress: () => void }) {
  const meta = NOTIFICATION_ICON[n.type];
  const tone = TONE[meta.tone];
  const image = n.campaign?.squareImageUrl ?? n.campaign?.coverImageUrl;
  const time = feedTime(n.createdAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.readAt ? "" : "Unread. "}${n.title}. ${n.body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View>
        {image ? (
          <>
            <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" transition={150} />
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <Ionicons name={meta.icon} size={13} color={tone.fg} />
            </View>
          </>
        ) : (
          <View style={[styles.thumb, styles.center, { backgroundColor: tone.bg, borderRadius: 26 }]}>
            <Ionicons name={meta.icon} size={22} color={tone.fg} />
          </View>
        )}
        {!n.readAt && <View style={styles.dot} />}
      </View>
      {/* Two lines only: what happened (with the time), then which campaign; the full message is in the accessibility label */}
      <View style={{ flex: 1, justifyContent: "center", minHeight: 52 }}>
        <View style={styles.itemHead}>
          <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {n.campaign?.title ? feedHeadline(n) : n.title}
          </Text>
          <Text variant="caption" color={colors.textSubtle}>
            {time}
          </Text>
        </View>
        <Text variant="bodySm" numberOfLines={1} style={styles.itemBody}>
          {n.campaign?.title ?? n.body}
        </Text>
      </View>
    </Pressable>
  );
}

function FollowingList() {
  const tabSpace = useTabBarSpace();
  const query = useFollowing();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <FlatList
      data={query.data}
      keyExtractor={(c) => c.id}
      contentContainerStyle={[styles.list, { paddingBottom: spacing.huge + tabSpace }]}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      renderItem={({ item: c }) => <FollowedCampaignCard c={c} />}
      ListEmptyComponent={
        <EmptyState
          compact
          icon="notifications-outline"
          title="Not following anything yet"
          body="Tap Follow on a campaign to get its milestones and updates. Campaigns you back are followed automatically."
          actionLabel="Explore campaigns"
          onAction={() => router.navigate("/explore")}
        />
      }
    />
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    head: { paddingHorizontal: spacing.xl, gap: 2, marginBottom: spacing.md },
    segment: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, marginTop: spacing.lg },
    segmentItem: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
    segmentActive: {
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    list: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.huge, gap: spacing.md },
    listHead: { paddingHorizontal: spacing.xl },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xs,
    },
    markAll: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
    center: { alignItems: "center", justifyContent: "center" },
    hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    item: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      alignItems: "flex-start",
    },
    pressed: { backgroundColor: colors.surface },
    itemHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    itemBody: { marginTop: 2 },
    thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.surface },
    // Event type on the image corner
    badge: {
      position: "absolute",
      right: -5,
      bottom: -5,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
    },
    // Unread marker on the icon's corner
    dot: {
      position: "absolute",
      top: -3,
      right: -3,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.background, // ring separates the dot from the icon
    },
  }),
);
