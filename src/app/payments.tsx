import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { usePaymentHistory } from "@/api/queries";
import type { Contribution, ContributionStatus } from "@/api/types";
import { EmptyState, ErrorState, LoadingState, Text } from "@/components/ui";
import { Pill, PillGrid } from "@/components/ui/filter-mat";
import { CampaignThumb } from "@/features/campaigns/campaign-parts";
import { date, money } from "@/lib/format";
import { PAYMENT_STATUS, TONE } from "@/lib/labels";
import { colors, radius, shadow, spacing, themed } from "@/theme";

type Filter = "all" | "paid" | "declined" | "cancelled";

const FILTERS: { value: Filter; label: string; match: (s: ContributionStatus) => boolean }[] = [
  { value: "all", label: "All", match: () => true },
  { value: "paid", label: "Paid", match: (s) => s === "succeeded" },
  { value: "declined", label: "Declined", match: (s) => s === "rejected" || s === "failed" },
  { value: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" },
];

export default function PaymentsScreen() {
  const query = usePaymentHistory();
  const [filter, setFilter] = useState<Filter>("all");
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const items = query.data.pages.flatMap((p) => p.items);

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState
          icon="receipt-outline"
          title="No payments yet"
          body="When you back a campaign, your receipt appears here."
          actionLabel="Explore campaigns"
          onAction={() => router.navigate("/explore")}
        />
      </View>
    );
  }

  const match = FILTERS.find((f) => f.value === filter)!.match;
  const shown = items.filter((p) => match(p.status));

  return (
    <View style={styles.screen}>
      <View style={{ marginBottom: spacing.lg }}>
        <PillGrid columns={3}>
          {FILTERS.map((f) => {
            const n = items.filter((p) => f.match(p.status)).length;
            return (
              <Pill key={f.value} label={f.label} count={n || undefined} selected={filter === f.value} onPress={() => setFilter(f.value)} />
            );
          })}
        </PillGrid>
      </View>
      {shown.length === 0 ? (
        <EmptyState compact icon="receipt-outline" title="Nothing here" body="No payments of this kind." />
      ) : (
        // One white card around the whole list; it grows with its rows and scrolls when longer than the screen
        <FlatList
          style={styles.card}
          data={shown}
          keyExtractor={(c) => c.id}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          renderItem={({ item, index }) => <PaymentRow p={item} first={index === 0} />}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} /> : null
          }
        />
      )}
    </View>
  );
}

function PaymentRow({ p, first }: { p: Contribution; first: boolean }) {
  const s = PAYMENT_STATUS[p.status];
  const tone = TONE[s.tone];
  const ok = p.status === "succeeded";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.campaign.title}, ${money(p.breakdown.totalChargedCents)}, ${s.label}`}
      onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: p.id } })}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.primaryTint }]}
    >
      <CampaignThumb uri={p.campaign.coverImageUrl} size={48} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" numberOfLines={1}>
          {p.campaign.title}
        </Text>
        <Text variant="caption">{date(p.paidAt ?? p.createdAt)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text variant="title" color={ok ? colors.text : colors.textMuted} style={!ok && styles.struck}>
          {money(p.breakdown.totalChargedCents)}
        </Text>
        <View style={styles.status}>
          <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={13} color={tone.fg} />
          <Text variant="caption" color={tone.fg}>
            {s.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
    card: { flexGrow: 0, borderRadius: radius.lg, backgroundColor: colors.card, ...shadow.card },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    status: { flexDirection: "row", alignItems: "center", gap: 3 },
    struck: { textDecorationLine: "line-through" },
  }),
);
