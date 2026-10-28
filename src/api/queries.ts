// React Query hooks: one place for cache keys, so a mutation can refresh exactly what it changed.
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { campaignsApi, type CampaignListQuery } from "./campaigns";
import { contributionsApi } from "./contributions";
import { engageApi } from "./engage";
import { platformApi } from "./platform";
import { adminApi } from "./admin";
import type { AdminTab, AnalyticsRange, CampaignStatus, MyCampaignTab, PublicCampaign, ReviewInput } from "./types";

export const keys = {
  config: ["config"] as const,
  campaigns: (q: CampaignListQuery) => ["campaigns", q] as const,
  campaign: (idOrSlug: string) => ["campaign", idOrSlug] as const,
  report: (idOrSlug: string) => ["report", idOrSlug] as const,
  updates: (id: string) => ["updates", id] as const,
  comments: (id: string) => ["comments", id] as const,
  myCampaigns: (tab?: MyCampaignTab) => ["my-campaigns", tab ?? "all"] as const,
  myCampaign: (id: string) => ["my-campaign", id] as const,
  analytics: (id: string) => ["analytics", id] as const,
  following: ["following"] as const,
  backed: ["backed"] as const,
  history: ["history"] as const,
  contribution: (id: string) => ["contribution", id] as const,
  notifications: ["notifications"] as const,
  unread: ["unread"] as const,
  admin: {
    campaigns: (tab: AdminTab) => ["admin", "campaigns", tab] as const,
    campaign: (id: string) => ["admin", "campaign", id] as const,
    analytics: (days: AnalyticsRange) => ["admin", "analytics", days] as const,
  },
};

// ─── Live status ──────────────────────────────────────────────────────────────
// The server moves campaigns on by itself (review, closing funding, ad setup, delivery reports).
// Screens showing a campaign in one of those stages re-check it, and any status change seen
// anywhere refreshes every list and detail that could show it.

const MOVING: CampaignStatus[] = ["submitted", "approved", "funded", "funding_ended", "distribution_prep"];

/** How often to re-check, given the statuses on screen: quickly mid-transition, gently while ads run. */
function pollFor(statuses: (CampaignStatus | undefined)[]) {
  if (statuses.some((st) => st && MOVING.includes(st))) return 3_000;
  if (statuses.includes("promoting")) return 15_000;
  return false as const;
}

export function refreshCampaignViews(qc: QueryClient) {
  for (const key of [["my-campaigns"], ["my-campaign"], ["campaigns"], ["campaign"], ["analytics"], ["report"]]) {
    void qc.invalidateQueries({ queryKey: key });
  }
  void qc.invalidateQueries({ queryKey: keys.notifications });
  void qc.invalidateQueries({ queryKey: keys.unread });
  void qc.invalidateQueries({ queryKey: keys.backed });
  void qc.invalidateQueries({ queryKey: keys.following });
}

/** Refreshes everything else once the statuses seen here change (not on first load). */
function useStatusSync(signature: string | undefined) {
  const qc = useQueryClient();
  const seen = useRef(signature);
  useEffect(() => {
    if (signature === undefined) return;
    if (seen.current !== undefined && seen.current !== signature) refreshCampaignViews(qc);
    seen.current = signature;
  }, [signature, qc]);
}

export function useConfig() {
  return useQuery({ queryKey: keys.config, queryFn: platformApi.config, staleTime: Infinity });
}

type FeedQuery = Omit<CampaignListQuery, "offset" | "limit">;

const feedOptions = (query: FeedQuery) => ({
  queryKey: keys.campaigns(query),
  queryFn: ({ pageParam }: { pageParam: number }) => campaignsApi.list({ ...query, limit: 10, offset: pageParam }),
  initialPageParam: 0,
  getNextPageParam: (last: { nextOffset: number | null }) => last.nextOffset ?? undefined,
});

/**
 * Started as soon as the saved login is known, while fonts load and the splash animation plays:
 * the feeds every tab opens with, the signed-in lists, and the campaign images (pre-cached), so
 * screens open already filled in.
 */
export function prefetchStartup(qc: QueryClient, signedIn: boolean, isAdmin = false) {
  if (isAdmin) {
    // The admin only sees the review queue and analytics
    void qc.prefetchQuery({ queryKey: keys.admin.campaigns("pending"), queryFn: () => adminApi.campaigns("pending") });
    void qc.prefetchQuery({ queryKey: keys.admin.analytics("30"), queryFn: () => adminApi.analytics("30") });
    return;
  }
  const feeds: FeedQuery[] = [{ featured: true, sort: "most_funded" }, { sort: "newest" }];
  void qc.prefetchQuery({ queryKey: keys.config, queryFn: platformApi.config, staleTime: Infinity });
  for (const query of feeds) {
    void qc.prefetchInfiniteQuery(feedOptions(query)).then(() => {
      const data = qc.getQueryData<{ pages: { items: { coverImageUrl: string | null; squareImageUrl: string | null }[] }[] }>(keys.campaigns(query));
      const urls = (data?.pages[0]?.items ?? []).flatMap((c) => [c.coverImageUrl, c.squareImageUrl]).filter((u): u is string => !!u);
      if (urls.length) void Image.prefetch(urls).catch(() => {});
    });
  }
  if (!signedIn) return;
  void qc.prefetchQuery({ queryKey: keys.myCampaigns("drafts"), queryFn: () => campaignsApi.mine("drafts") });
  void qc.prefetchQuery({ queryKey: keys.unread, queryFn: engageApi.unreadCount });
  void qc.prefetchInfiniteQuery({
    queryKey: keys.notifications,
    queryFn: ({ pageParam }: { pageParam: number }) => engageApi.notifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: { nextOffset: number | null }) => last.nextOffset ?? undefined,
  });
  void qc.prefetchQuery({ queryKey: keys.following, queryFn: engageApi.following });
  void qc.prefetchQuery({ queryKey: keys.backed, queryFn: contributionsApi.backed });
}

export function useCampaignFeed(query: FeedQuery) {
  const feed = useInfiniteQuery(feedOptions(query));
  // Tabs stay mounted, so reload a stale list whenever the screen is shown again
  // (e.g. a campaign you submitted has gone live since)
  const { isStale, refetch } = feed;
  useFocusEffect(
    useCallback(() => {
      if (isStale) void refetch();
    }, [isStale, refetch]),
  );
  return feed;
}

export function useCampaign(idOrSlug: string) {
  const { isSignedIn } = useAuth();
  // The viewer block differs per user, so signed-in and signed-out views are cached separately
  const query = useQuery({
    queryKey: [...keys.campaign(idOrSlug), isSignedIn],
    queryFn: () => campaignsApi.get(idOrSlug),
    enabled: !!idOrSlug,
    refetchInterval: (q) => pollFor([q.state.data?.status]),
  });
  useStatusSync(query.data?.status);
  return query;
}

export function useReport(idOrSlug: string) {
  return useQuery({
    queryKey: keys.report(idOrSlug),
    queryFn: () => campaignsApi.report(idOrSlug),
    // A live report keeps updating until the promotion finishes
    refetchInterval: (q) => (q.state.data && !q.state.data.isFinal ? 15_000 : false),
  });
}

export function useUpdates(id: string | undefined) {
  return useQuery({ queryKey: keys.updates(id ?? ""), queryFn: () => campaignsApi.updates(id!), enabled: !!id });
}

export function useComments(id: string) {
  return useQuery({ queryKey: keys.comments(id), queryFn: () => engageApi.comments(id) });
}

export function useMyCampaigns(tab?: MyCampaignTab) {
  const { isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: keys.myCampaigns(tab),
    queryFn: () => campaignsApi.mine(tab),
    enabled: isSignedIn,
    refetchInterval: (q) => pollFor(q.state.data?.items.map((c) => c.status) ?? []),
  });
  useStatusSync(query.data?.items.map((c) => `${c.id}:${c.status}`).join(","));
  return query;
}

export function useMyCampaign(id: string) {
  // Owner views always refetch on open: the creation form initialises from this and must not start from a stale copy
  const query = useQuery({
    queryKey: keys.myCampaign(id),
    queryFn: () => campaignsApi.getMine(id),
    enabled: !!id,
    refetchOnMount: "always",
    refetchInterval: (q) => pollFor([q.state.data?.status]),
  });
  useStatusSync(query.data?.status);
  return query;
}

export function useAnalytics(id: string, enabled = true) {
  // Delivery numbers arrive on a timer while ads run; a gentle poll keeps the charts current
  return useQuery({ queryKey: keys.analytics(id), queryFn: () => campaignsApi.analytics(id), enabled, refetchInterval: 15_000 });
}

export function useFollowing() {
  const { isSignedIn } = useAuth();
  return useQuery({ queryKey: keys.following, queryFn: engageApi.following, enabled: isSignedIn });
}

export function useBacked() {
  const { isSignedIn } = useAuth();
  return useQuery({ queryKey: keys.backed, queryFn: contributionsApi.backed, enabled: isSignedIn });
}

export function usePaymentHistory() {
  const { isSignedIn } = useAuth();
  return useInfiniteQuery({
    queryKey: keys.history,
    queryFn: ({ pageParam }) => contributionsApi.history(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: isSignedIn,
  });
}

export function useContribution(id: string) {
  return useQuery({ queryKey: keys.contribution(id), queryFn: () => contributionsApi.get(id) });
}

export function useNotifications() {
  const { isSignedIn } = useAuth();
  return useInfiniteQuery({
    queryKey: keys.notifications,
    queryFn: ({ pageParam }) => engageApi.notifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    enabled: isSignedIn,
  });
}

export function useUnreadCount() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: keys.unread,
    queryFn: engageApi.unreadCount,
    enabled: isSignedIn,
    // Lifecycle events arrive on a timer server-side, so poll gently for the tab badge
    refetchInterval: 30_000,
  });
}

/** Follow / unfollow with an instant UI change, rolled back if the request fails. */
export function useFollowToggle(campaign: PublicCampaign) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) => (follow ? engageApi.follow(campaign.id) : engageApi.unfollow(campaign.id)),
    onMutate: async (follow) => {
      const snapshots = qc.getQueriesData<PublicCampaign>({ queryKey: ["campaign"] });
      qc.setQueriesData<PublicCampaign>({ queryKey: ["campaign"] }, (old) =>
        old && old.id === campaign.id && old.viewer
          ? {
              ...old,
              viewer: { ...old.viewer, isFollowing: follow },
              counts: { ...old.counts, followers: old.counts.followers + (follow ? 1 : -1) },
            }
          : old,
      );
      return { snapshots };
    },
    onError: (_err, _follow, ctx) => ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.following }),
  });
}

/** After money moves, every view of funding is stale. */
export function invalidateFunding(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [["campaigns"], ["campaign"], keys.backed, keys.history, keys.following, keys.notifications, keys.unread, ["my-campaigns"]]) {
    qc.invalidateQueries({ queryKey: key });
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/** The admin's review queue for one tab; new submissions arrive on their own, so it re-checks gently. */
export function useAdminCampaigns(tab: AdminTab) {
  return useQuery({ queryKey: keys.admin.campaigns(tab), queryFn: () => adminApi.campaigns(tab), refetchInterval: 15_000 });
}

export function useAdminCampaign(id: string) {
  return useQuery({ queryKey: keys.admin.campaign(id), queryFn: () => adminApi.campaign(id), enabled: !!id });
}

export function useAdminReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewInput) => adminApi.review(id, input),
    onSuccess: (campaign) => {
      qc.setQueryData(keys.admin.campaign(id), campaign);
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useAdminAnalytics(days: AnalyticsRange) {
  // Switching range keeps the previous numbers on screen until the new ones arrive
  return useQuery({ queryKey: keys.admin.analytics(days), queryFn: () => adminApi.analytics(days), refetchInterval: 30_000, placeholderData: keepPreviousData });
}
