// Which kinds of notifications to get, and whether they also arrive as phone pushes. Changes save
// straight away (optimistically) and the server applies them to everything it sends.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Switch, View } from "react-native";
import { authApi } from "@/api/auth";
import type { NotificationCategory, NotificationPreferences } from "@/api/types";
import { Card, ErrorState, Skeleton, Text, useToast } from "@/components/ui";
import type { IconName } from "@/lib/labels";
import { colors, spacing, themed } from "@/theme";

const KEY = ["notification-prefs"] as const;

const CATEGORIES: { key: NotificationCategory; icon: IconName; title: string; body: string }[] = [
  { key: "my_campaigns", icon: "megaphone-outline", title: "My campaigns", body: "Review decisions: approved, changes requested, not approved" },
  { key: "funding", icon: "flag-outline", title: "Funding", body: "Milestones, deadlines and when funding closes" },
  { key: "payments", icon: "card-outline", title: "Payments", body: "Successful and unsuccessful contributions" },
  { key: "promotion", icon: "trending-up-outline", title: "Promotion & reports", body: "Ads starting, reach progress and final reports" },
  { key: "updates", icon: "newspaper-outline", title: "Updates & comments", body: "Creator updates, new comments, campaigns going live" },
];

export function NotificationSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const prefs = useQuery({ queryKey: KEY, queryFn: authApi.notificationPreferences });
  const save = useMutation({
    mutationFn: authApi.saveNotificationPreferences,
    // Flip the switch immediately; put it back if saving fails
    onMutate: async (next: NotificationPreferences) => {
      await qc.cancelQueries({ queryKey: KEY });
      const before = qc.getQueryData<NotificationPreferences>(KEY);
      qc.setQueryData(KEY, next);
      return { before };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.before) qc.setQueryData(KEY, ctx.before);
      toast("Couldn't save your notification settings", "error");
    },
  });

  if (prefs.isPending) return <Skeleton width="100%" height={260} round={16} />;
  if (prefs.isError) return <ErrorState compact error={prefs.error} onRetry={() => prefs.refetch()} />;
  const p = prefs.data;

  const toggle = (key: NotificationCategory, on: boolean) =>
    save.mutate({ ...p, muted: on ? p.muted.filter((m) => m !== key) : [...p.muted, key] });

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ gap: spacing.md }}>
        <Row
          icon="phone-portrait-outline"
          title="Push notifications"
          body="Also send them to this phone. Activity always keeps the full list."
          value={p.push}
          onChange={(push) => save.mutate({ ...p, push })}
        />
      </Card>
      <Card style={{ gap: spacing.md }}>
        {CATEGORIES.map((c, i) => (
          <View key={c.key} style={{ gap: spacing.md }}>
            {i > 0 && <View style={styles.hairline} />}
            <Row icon={c.icon} title={c.title} body={c.body} value={!p.muted.includes(c.key)} onChange={(on) => toggle(c.key, on)} />
          </View>
        ))}
      </Card>
      <View style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" style={{ flex: 1 }}>
          Security alerts (like a password change) are always sent. To stop hearing about one campaign, unfollow it.
        </Text>
      </View>
    </View>
  );
}

function Row({
  icon,
  title,
  body,
  value,
  onChange,
}: {
  icon: IconName;
  title: string;
  body: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title">{title}</Text>
        <Text variant="caption">{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.card}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48 },
    icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
    hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
    note: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xs },
  }),
);
