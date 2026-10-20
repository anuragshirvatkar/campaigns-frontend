import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CampaignSort } from "@/api/campaigns";
import { useCampaignFeed, useUnreadCount } from "@/api/queries";
import type { CampaignStatus, Category } from "@/api/types";
import { CampaignCardSkeleton, EmptyState, ErrorState, StatusBarShade, Text } from "@/components/ui";
import { FilterMat, MoreToggle, Pill, PillRow, useFilterMenu, useNarrowFilters, useTwoLineFit } from "@/components/ui/filter-mat";
import { useTabBarSpace } from "@/components/ui/tab-bar";
import { useAuth } from "@/features/auth/auth-provider";
import { CampaignCard } from "@/features/campaigns/campaign-card";
import { HomeHeader, useHomeScale } from "@/features/home/home-top";
import { CATEGORIES, CATEGORY } from "@/lib/labels";
import { colors, fonts, radius, spacing, themed } from "@/theme";
import { Appear } from "@/components/ui/motion";

const SORTS: { value: CampaignSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most_funded", label: "Most funded" },
  { value: "ending_soon", label: "Ending soon" },
  { value: "nearly_funded", label: "Nearly funded" },
];

const STATUSES: { value: CampaignStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "funding", label: "Open" },
  { value: "promoting", label: "Promoting" },
  { value: "completed", label: "Completed" },
];

// Short names so chips fit on small phones
const SHORT: Partial<Record<Category, string>> = { arts_culture: "Art", public_policy: "Policy", economic_policy: "Economy" };
const chipLabel = (c: Category) => SHORT[c] ?? CATEGORY[c].label;

type Menu = "categories" | "sort";

// Order on screen: as many as fit on two lines (More ends the second), the rest in the More mat
const CATEGORY_ORDER: Category[] = [
  "environment",
  "health",
  "education",
  "science",
  "community",
  "arts_culture",
  "public_policy",
  "economic_policy",
  "business",
  "other",
].filter((c): c is Category => CATEGORIES.includes(c as Category));

export default function ExploreScreen() {
  const u = useHomeScale();
  const { user, isSignedIn } = useAuth();
  const unread = useUnreadCount();
  const tabSpace = useTabBarSpace();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [sort, setSort] = useState<CampaignSort>("newest");
  const [status, setStatus] = useState<CampaignStatus | undefined>();

  // Search after a short pause, not on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // "Ending soon" and "Nearly funded" only make sense for campaigns still open
  const effectiveStatus = sort === "ending_soon" || sort === "nearly_funded" ? undefined : status;
  const feed = useCampaignFeed({ q: q || undefined, category, sort, status: effectiveStatus });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = !!(q || category || effectiveStatus);

  // Filter rows show a few options; More unrolls a mat over the page with the rest
  const catRowRef = useRef<View>(null);
  const sortRowRef = useRef<View>(null);
  const {
    rootRef,
    menu,
    shownMenu,
    anchor,
    toggle: toggleMenu,
    close: closeMenu,
  } = useFilterMenu<Menu>({
    categories: catRowRef,
    sort: sortRowRef,
  });

  const narrowSort = useNarrowFilters([{ label: "Newest" }, { label: "Most funded" }, { label: "More", icon: true }]);
  // A category picked from More moves to the front, so the selection is always visible
  const ordered = category && CATEGORY_ORDER.includes(category) ? [category, ...CATEGORY_ORDER.filter((c) => c !== category)] : CATEGORY_ORDER;
  const shownCount = useTwoLineFit(
    [{ label: "All" }, ...ordered.map((c) => ({ label: chipLabel(c), icon: true }))],
    { label: "More", icon: true },
  );
  const shownCategories = ordered.slice(0, Math.max(shownCount - 1, 0)); // minus All
  const hiddenCategories = ordered.slice(shownCategories.length);
  const pickCategory = (c: Category | undefined) => {
    setCategory(c === undefined || category === c ? undefined : c);
    closeMenu();
  };

  const openOnly = sort === "ending_soon" || sort === "nearly_funded";
  const frontSorts: CampaignSort[] = narrowSort ? [sort] : ["newest", sort === "newest" ? "most_funded" : sort];
  const moreSorts = SORTS.filter((x) => !frontSorts.includes(x.value));
  const sortLabel = (v: CampaignSort) => SORTS.find((x) => x.value === v)?.label ?? v;
  const pickSort = (v: CampaignSort) => {
    setSort(v);
    closeMenu();
  };
  const pickStatus = (v: CampaignStatus | undefined) => {
    setStatus(v);
    closeMenu();
  };

  const categoryRow = (
    <PillRow>
      <Pill label="All" selected={!category} onPress={() => pickCategory(undefined)} />
      {shownCategories.map((c) => (
        <Pill key={c} label={chipLabel(c)} icon={CATEGORY[c].icon} selected={category === c} onPress={() => pickCategory(c)} />
      ))}
      <MoreToggle open={menu === "categories"} onPress={() => toggleMenu("categories")} />
    </PillRow>
  );
  const sortRow = (
    <PillRow>
      {frontSorts.map((v) => (
        <Pill key={v} label={sortLabel(v)} selected={sort === v} onPress={() => pickSort(v)} />
      ))}
      <MoreToggle open={menu === "sort"} onPress={() => toggleMenu("sort")} />
    </PillRow>
  );

  const clearAll = () => {
    setSearch("");
    setQ("");
    setCategory(undefined);
    setStatus(undefined);
    setSort("newest");
  };

  const header = (
    <View style={{ paddingTop: insets.top + spacing.lg }}>
      <View style={{ marginHorizontal: -spacing.xl + u(22), marginBottom: spacing.sm }}>
        <HomeHeader u={u} title="Explore" hasUnread={(unread.data?.count ?? 0) > 0} user={isSignedIn && user ? user : null} />
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles, summaries, creators"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search campaigns"
          maxFontSizeMultiplier={1.4}
        />
        {search.length > 0 && (
          <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
          </Pressable>
        )}
      </View>

      <Text variant="overline" color={colors.textMuted} style={styles.filterLabel}>
        Categories
      </Text>
      {/* Two lines of pills that hug their labels; More always ends the second line */}
      <View ref={catRowRef} collapsable={false}>
        {categoryRow}
      </View>

      <Text variant="overline" color={colors.textMuted} style={[styles.filterLabel, { marginTop: spacing.md }]}>
        Sort by
      </Text>
      <View ref={sortRowRef} collapsable={false}>
        {sortRow}
      </View>

      <View style={styles.resultsRow}>
        <Text variant="bodySm" accessibilityLiveRegion="polite">
          {feed.isPending
            ? "Searching…"
            : `${items.length}${feed.hasNextPage ? "+" : ""} campaign${items.length === 1 ? "" : "s"}`}
        </Text>
        {filtered && (
          <Pressable accessibilityRole="button" onPress={clearAll} hitSlop={8}>
            <Text variant="title" color={colors.primary} style={{ fontSize: 14 }}>
              Clear filters
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View ref={rootRef} collapsable={false} style={styles.screen}>
      <FlatList
        onScrollBeginDrag={closeMenu}
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.huge + tabSpace }]}
        data={feed.isPending || feed.isError ? [] : items}
        keyExtractor={(c) => c.id}
        renderItem={({ item, index }) => (
          <Appear index={index}>
            <CampaignCard campaign={item} />
          </Appear>
        )}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => feed.refetch()}
        ListEmptyComponent={
          feed.isPending ? (
            <>
              <CampaignCardSkeleton />
              <CampaignCardSkeleton />
            </>
          ) : feed.isError ? (
            <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
          ) : filtered ? (
            <EmptyState
              icon="search-outline"
              title="No campaigns match"
              body={q ? `Nothing found for “${q}”. Try other words or fewer filters.` : "Try another category or stage."}
              actionLabel="Clear filters"
              onAction={clearAll}
            />
          ) : (
            <EmptyState
              icon="megaphone-outline"
              title="No campaigns yet"
              body="New campaigns appear here once they pass review."
            />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} /> : null
        }
      />
      {shownMenu && anchor && (
        <FilterMat
          open={menu === shownMenu}
          anchor={anchor}
          onClose={closeMenu}
          row={shownMenu === "categories" ? categoryRow : sortRow}
        >
          {shownMenu === "categories" ? (
            <PillRow>
              {hiddenCategories.map((c) => (
                <Pill key={c} label={chipLabel(c)} icon={CATEGORY[c].icon} selected={category === c} onPress={() => pickCategory(c)} />
              ))}
            </PillRow>
          ) : (
            <>
              <PillRow>
                {moreSorts.map((x) => (
                  <Pill key={x.value} label={x.label} selected={sort === x.value} onPress={() => pickSort(x.value)} />
                ))}
              </PillRow>
              {!openOnly && (
                <>
                  <Text variant="overline" color={colors.textMuted} style={{ marginTop: 6 }}>
                    Stage
                  </Text>
                  <PillRow>
                    {STATUSES.map((x) => (
                      <Pill key={x.label} label={x.label} selected={status === x.value} onPress={() => pickStatus(x.value)} />
                    ))}
                  </PillRow>
                </>
              )}
            </>
          )}
        </FilterMat>
      )}
      <StatusBarShade />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 12 },
  filterLabel: { marginTop: spacing.lg, marginBottom: 6 },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
}));
