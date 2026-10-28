// Plain-language explanations of the unfamiliar parts: use of funds, review, audience and distribution.
// Text follows the backend rules (fees in app.config, keep-what-you-raise, no refunds once paid).
import { StyleSheet, View } from "react-native";
import type { CampaignDetail } from "@/api/types";
import { Chip, Text } from "@/components/ui";
import { money } from "@/lib/format";
import { CHANNEL } from "@/lib/labels";
import { colors, radius, spacing, themed } from "@/theme";

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Text variant="bodySm" color={colors.text} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

/** The $1 split bar: how much of each dollar becomes advertising. */
export function FundsSplit({ adSharePct, platformFeePct }: { adSharePct: number; platformFeePct: number }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.split}>
        <View style={[styles.splitAd, { flex: adSharePct }]}>
          <Text variant="caption" color={colors.textOnDark} style={styles.splitText}>
            {adSharePct}% ads
          </Text>
        </View>
        <View style={[styles.splitFee, { flex: platformFeePct }]}>
          <Text variant="caption" color={colors.primary} style={styles.splitText}>
            {platformFeePct}%
          </Text>
        </View>
      </View>
      <Text variant="caption">
        Of every $1: {adSharePct}¢ buys advertising for this message, {platformFeePct}¢ covers review, ad setup and
        reporting.
      </Text>
    </View>
  );
}

export function UseOfFunds({ c }: { c: Pick<CampaignDetail, "useOfFunds"> }) {
  const f = c.useOfFunds;
  return (
    <View style={{ gap: spacing.md }}>
      <FundsSplit adSharePct={f.adSharePct} platformFeePct={f.platformFeePct} />
      <Bullet>{`Your contribution pays to show this message to more people. It is not a donation to the cause, person or organization in the story.`}</Bullet>
      <Bullet>{`Platform fee: ${f.platformFeePct}% of each contribution, for review, ad setup, delivery and reporting.`}</Bullet>
      <Bullet>{`Card processing: about ${f.processingFeePct}% is added on top at checkout, so the full contribution goes to the campaign.`}</Bullet>
      <Bullet>{`Allocation: the advertising share is spent by the platform on the channels listed below. Creators never receive the money directly.`}</Bullet>
      <Bullet>{`Keep what you raise: if the goal isn't reached by the deadline, what was raised is still used to promote the message.`}</Bullet>
      <Bullet>{`Refunds: a successful payment is committed to promotion and isn't refundable. Failed, declined or cancelled payments are never charged.`}</Bullet>
      <Bullet>{`Unspent funds: the advertising budget is spent in full on delivering this message, and is never paid out to the creator.`}</Bullet>
      {f.adBudgetCents > 0 && <Bullet>{`Advertising budget so far: ${money(f.adBudgetCents)}.`}</Bullet>}
    </View>
  );
}

/** The short version for checkout (the fee split is already in the breakdown above it): refunds and keep-what-you-raise. */
export function CheckoutTerms() {
  return (
    <View style={{ gap: spacing.sm }}>
      <Bullet>{`No refunds once paid: the money is spent on promotion. Failed or cancelled payments are never charged.`}</Bullet>
      <Bullet>{`If the goal isn't reached, what's raised still promotes the message.`}</Bullet>
    </View>
  );
}

export function ReviewProcess() {
  return (
    <View style={{ gap: spacing.md }}>
      <Bullet>Every campaign is reviewed before it can be funded: the story, the sources behind its claims, the ad visuals and the targeting.</Bullet>
      <Bullet>{`Approval means the campaign meets the platform's content and advertising rules. It is not an independent fact-check or endorsement.`}</Bullet>
      <Bullet>{`If a live campaign's content changes, it goes back through review before its ads are updated.`}</Bullet>
      <Bullet>A person on the Campaigns team makes every decision. An automated check flags possible problems for them first.</Bullet>
    </View>
  );
}

export function AudienceAndDistribution({ c }: { c: Pick<CampaignDetail, "reach" | "targetAudience" | "durationDays"> }) {
  const r = c.reach;
  const age = r.ageMin || r.ageMax ? `${r.ageMin ?? 18}–${r.ageMax ?? "65+"}` : "Adults (18+)";
  return (
    <View style={{ gap: spacing.md }}>
      {c.targetAudience && (
        <Text variant="body" color={colors.text}>
          {c.targetAudience}
        </Text>
      )}
      <View style={styles.grid}>
        <Fact label="Where" value={r.locations?.length ? r.locations.join(", ") : "Set during review"} />
        <Fact label="Ages" value={age} />
        <Fact label="Runs for" value={c.durationDays ? `${c.durationDays} days of funding` : "—"} />
      </View>
      {!!r.interests?.length && (
        <View style={styles.chips}>
          {r.interests.map((i) => (
            <Chip key={i} label={i} size="sm" />
          ))}
        </View>
      )}
      {!!r.channels?.length && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline">Placements</Text>
          {r.channels.map((ch) => (
            <Text key={ch} variant="bodySm" color={colors.text}>
              {CHANNEL[ch]?.label ?? ch} · {r.budgetSplit?.[ch] ?? 0}% of the ad budget
            </Text>
          ))}
        </View>
      )}
      <Bullet>The creator chooses the intended audience. The platform finalises exact targeting, placements and bids during review.</Bullet>
      <Bullet>{`Ads are labelled as sponsored. Backers' names are never used in ads, and audiences are targeted by broad characteristics, not personal data from this app.`}</Bullet>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="caption">{label}</Text>
      <Text variant="title">{value}</Text>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bullet: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
  split: { flexDirection: "row", height: 28, borderRadius: radius.sm, overflow: "hidden" },
  splitAd: { backgroundColor: colors.primary, justifyContent: "center", paddingHorizontal: spacing.sm },
  splitFee: { backgroundColor: colors.primarySoft, justifyContent: "center", alignItems: "center" },
  splitText: { fontFamily: "Rubik_600SemiBold" },
  grid: { gap: spacing.sm },
  fact: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
}));
