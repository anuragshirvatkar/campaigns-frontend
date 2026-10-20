// Creator's campaigns: drafts to finish and live campaigns to manage, filtered by stage.
import { router } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useMyCampaigns } from "@/api/queries";
import type { MyCampaignCard, MyCampaignTab } from "@/api/types";
import { EmptyState, ErrorState, LoadingState, Pill as StatusBadge, StatusPill } from "@/components/ui";
import { chunk, FilterMat, MoreToggle, Pill, PillRow, useFilterMenu, useNarrowFilters } from "@/components/ui/filter-mat";
import { CampaignListCard } from "@/features/campaigns/campaign-parts";
import { ImpactCard } from "@/features/campaigns/impact-card";
import { compactNumber, money, percent, timeAgo, timeLeft } from "@/lib/format";
import { colors, spacing, themed } from "@/theme";
import { Appear } from "@/components/ui/motion";

type Filter = MyCampaignTab | "all";

const HERO_ART = require("../../assets/images/states/creator-hero.png");

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "funding", label: "Funding" },
  { value: "requires_action", label: "Action needed" },
  { value: "under_review", label: "In review" },
  { value: "promoting", label: "Promoting" },
  { value: "completed", label: "Completed" },
];
const FRONT: Filter[] = ["all", "drafts", "funding"];

export default function MyCampaignsScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const query = useMyCampaigns(filter === "all" ? undefined : filter);
  const all = useMyCampaigns(); // counts for every filter come with any request
  const counts = query.data?.counts ?? all.data?.counts;
  const rowRef = useRef<View>(null);
  const { rootRef, menu, shownMenu, anchor, toggle, close } = useFilterMenu<"filters">({ filters: rowRef });

  // All, Drafts, Funding up front; a filter picked from More takes the last slot
  const narrow = useNarrowFilters([
    { label: "All", count: true },
    { label: "Drafts", count: true },
    { label: "Funding", count: true },
    { label: "More", icon: true },
  ]);
  const front: Filter[] = narrow
    ? ["all", filter === "all" ? "drafts" : filter]
    : FRONT.includes(filter)
      ? FRONT
      : ["all", "drafts", filter];
  const hidden = FILTERS.filter((f) => !front.includes(f.value));
  const label = (f: Filter) => FILTERS.find((x) => x.value === f)!.label;
  const count = (f: Filter) => (f === "all" ? all.data?.items.length : counts?.[f]);
  const pick = (f: Filter) => {
    setFilter(f);
    close();
  };
  const filterRow = (
    <PillRow>
      {front.map((v) => (
        <Pill key={v} label={label(v)} count={count(v)} selected={filter === v} onPress={() => pick(v)} />
      ))}
      <MoreToggle open={menu === "filters"} onPress={() => toggle("filters")} />
    </PillRow>
  );

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <View ref={rowRef} collapsable={false} style={styles.filters}>
        {filterRow}
      </View>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          onScrollBeginDrag={close}
          ListHeaderComponent={filter === "all" && all.data ? <CreatorImpact items={all.data.items} /> : null}
          renderItem={({ item, index }) => (
            <Appear index={index}>
              <MyCampaign c={item} />
            </Appear>
          )}
          ListEmptyComponent={
            <EmptyState
              compact
              icon={filter === "requires_action" ? "checkmark-done-outline" : "megaphone-outline"}
              title={filter === "requires_action" ? "Nothing needs your attention" : "No campaigns here"}
              body={
                filter === "requires_action"
                  ? "Unfinished drafts and campaigns closing soon under goal show up here."
                  : "Start a campaign and it will appear here."
              }
              actionLabel={filter === "requires_action" ? undefined : "Start a campaign"}
              onAction={() => router.navigate("/create")}
            />
          }
        />
      )}
      {shownMenu && anchor && (
        <FilterMat open={menu === shownMenu} anchor={anchor} onClose={close} row={filterRow}>
          {/* Two per line so every label keeps its full size */}
          <View style={{ gap: spacing.sm }}>
            {chunk(hidden, 2).map((line) => (
              <PillRow key={line[0].value}>
                {line.map((f) => (
                  <Pill
                    key={f.value}
                    label={label(f.value)}
                    count={count(f.value)}
                    selected={filter === f.value}
                    onPress={() => pick(f.value)}
                  />
                ))}
              </PillRow>
            ))}
          </View>
        </FilterMat>
      )}
    </View>
  );
}

/** Totals across everything the creator has published (drafts don't count); shown once they have any campaign. */
function CreatorImpact({ items }: { items: MyCampaignCard[] }) {
  const published = items.filter((c) => c.status !== "draft" && c.status !== "cancelled" && c.publishedAt);
  if (!items.length) return null;
  const raised = published.reduce((sum, c) => sum + c.funding.raisedCents, 0);
  const backers = published.reduce((sum, c) => sum + c.funding.backerCount, 0);
  // Same per-dollar estimate used across the app
  const reach = published.reduce((sum, c) => sum + (c.funding.raisedCents / 100) * c.funding.reachPerDollar, 0);
  const live = published.filter((c) => c.status === "funding" || c.status === "promoting").length;
  return (
    <ImpactCard
      art={HERO_ART}
      overline="Total raised"
      value={money(raised)}
      caption={
        published.length
          ? `from ${backers} ${backers === 1 ? "backer" : "backers"} across ${published.length} ${published.length === 1 ? "campaign" : "campaigns"}`
          : "Submit your first campaign and what backers fund shows up here"
      }
      stats={[
        { icon: "people", value: `~${compactNumber(Math.round(reach))}`, label: "people reached" },
        { icon: "pulse", value: String(live), label: live === 1 ? "campaign live" : "campaigns live" },
      ]}
    />
  );
}

function MyCampaign({ c }: { c: MyCampaignCard }) {
  const isDraft = c.status === "draft";
  const open = () =>
    isDraft
      ? router.push({ pathname: "/create/[id]", params: { id: c.id } })
      : router.push({ pathname: "/manage/[id]", params: { id: c.id } });
  const badge = (
    <View style={styles.badges}>
      <StatusPill status={c.status} />
      {c.requiresAction && <StatusBadge label="Action needed" tone="warning" />}
    </View>
  );

  if (isDraft) {
    return (
      <CampaignListCard
        title={c.title}
        imageUrl={c.squareImageUrl ?? c.coverImageUrl}
        badge={badge}
        progress={(c.currentStep / 5) * 100}
        progressLabel={`Step ${c.currentStep} of 5`}
        progressValue="Continue"
        detail={`Edited ${timeAgo(c.updatedAt)}`}
        onPress={open}
      />
    );
  }
  // Not live yet: show where it is in review instead of an empty funding bar
  if (c.status === "submitted" || c.status === "changes_requested" || c.status === "rejected") {
    return (
      <CampaignListCard
        title={c.title}
        imageUrl={c.squareImageUrl ?? c.coverImageUrl}
        badge={badge}
        progress={c.status === "submitted" ? 50 : 100}
        progressLabel={c.status === "submitted" ? "In review" : c.status === "rejected" ? "Not approved" : "Fix and resubmit"}
        progressValue={c.status === "changes_requested" ? "Open" : undefined}
        detail={`Updated ${timeAgo(c.updatedAt)}`}
        onPress={open}
      />
    );
  }
  const left = c.status === "funding" ? timeLeft(c.funding.deadline) : null;
  return (
    <CampaignListCard
      title={c.title}
      imageUrl={c.squareImageUrl ?? c.coverImageUrl}
      badge={badge}
      progress={c.funding.percentFunded}
      progressLabel={`${money(c.funding.raisedCents)} of ${money(c.funding.goalCents)}`}
      progressValue={percent(c.funding.percentFunded)}
      detail={[`${c.funding.backerCount} backers`, left].filter(Boolean).join(" · ")}
      onPress={open}
    />
  );
}

const styles = themed(() => StyleSheet.create({
  filters: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing.huge },
  badges: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
}));
