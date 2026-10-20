// Receipt for one payment attempt: the result, what it was for, the money breakdown and the details.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useContribution } from "@/api/queries";
import { Button, Card, ErrorState, LoadingState, ProgressBar, Screen, Text } from "@/components/ui";
import { openCampaign } from "@/features/campaigns/campaign-card";
import { campaignStyles, CampaignThumb, SectionLabel, ValueRow } from "@/features/campaigns/campaign-parts";
import { dateTime, money, percent, reachRange } from "@/lib/format";
import { PAYMENT_STATUS, TONE } from "@/lib/labels";
import { shareCampaign } from "@/lib/share";
import { colors, fonts, spacing, themed } from "@/theme";

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useContribution(id);
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const r = query.data;
  const s = PAYMENT_STATUS[r.status];
  const tone = TONE[s.tone];
  const b = r.breakdown;
  const ok = r.status === "succeeded";

  return (
    <Screen>
      {/* Result */}
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Ionicons name={ok ? "checkmark" : r.status === "pending" ? "time-outline" : "close"} size={30} color={tone.fg} />
        </View>
        <Text style={[styles.amount, !ok && { color: colors.textMuted }]}>{money(b.totalChargedCents)}</Text>
        <Text variant="title" color={tone.fg}>
          {s.label}
        </Text>
        <Text variant="caption">{dateTime(r.paidAt ?? r.createdAt)}</Text>
        {r.failureReason && (
          <Text variant="bodySm" align="center" color={colors.danger}>
            {r.failureReason}
          </Text>
        )}
      </View>

      {/* What it was for */}
      <Card onPress={() => openCampaign(r.campaign)} style={styles.campaign} accessibilityLabel={`Open ${r.campaign.title}`}>
        <CampaignThumb uri={r.campaign.coverImageUrl} size={52} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title" numberOfLines={2}>
            {r.campaign.title}
          </Text>
          <ProgressBar value={r.campaignFunding.percentFunded} height={5} />
          <Text variant="caption">
            {money(r.campaignFunding.raisedCents)} of {money(r.campaignFunding.goalCents)} · {percent(r.campaignFunding.percentFunded)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>

      <View style={campaignStyles.section}>
        <SectionLabel>Breakdown</SectionLabel>
        <Card style={{ gap: spacing.xs }}>
          <ValueRow label="Contribution" value={money(b.contributionCents)} />
          <ValueRow label="Goes to ads" value={money(b.adSpendCents)} accent />
          <ValueRow label="Platform fee" value={money(b.platformFeeCents)} />
          <ValueRow label="Card processing" value={money(b.processingFeeCents)} />
          <View style={styles.hairline} />
          <ValueRow label="Total" value={money(b.totalChargedCents)} strong />
        </Card>
      </View>

      <View style={campaignStyles.section}>
        <SectionLabel>Details</SectionLabel>
        <Card style={{ gap: spacing.xs }}>
          <ValueRow label="Receipt" value={r.receiptNumber} />
          {r.paymentRef && <ValueRow label="Payment reference" value={r.paymentRef.slice(0, 14)} />}
          {ok && <ValueRow label="Estimated reach" value={`${reachRange(r.estimatedReach)} people`} />}
          {r.isGuest ? (
            <ValueRow label="Paid as" value="Guest (no account)" />
          ) : (
            <ValueRow label="Name shown publicly" value={r.isPublic ? "Yes" : "No"} />
          )}
        </Card>
      </View>

      <Text variant="caption" color={colors.textSubtle} style={{ marginTop: spacing.lg }}>
        {r.isSimulated ? "Simulated payment for this prototype; no real money was charged. " : ""}
        Contributions fund the message&apos;s distribution and are not charitable donations.
      </Text>

      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        {ok && <Button label="Share campaign" icon="share-social-outline" onPress={() => shareCampaign(r.campaign)} />}
        <Button label="View campaign" variant={ok ? "ghost" : "primary"} onPress={() => openCampaign(r.campaign)} />
      </View>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  head: { alignItems: "center", gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.xl },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  amount: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 42, color: colors.text, includeFontPadding: false },
  campaign: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
}));
