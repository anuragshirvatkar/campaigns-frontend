// Back a campaign: choose amount → review fees & reach → simulated payment → confirmation.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { contributionsApi } from "@/api/contributions";
import { invalidateFunding, useCampaign, useConfig } from "@/api/queries";
import type { Contribution, ContributionWithFunding, PlatformConfig, PublicCampaign } from "@/api/types";
import { Button, Card, ErrorState, LoadingState, ProgressBar, ResultAnimation, Screen, Text, TextField, useToast } from "@/components/ui";
import { AccordionRow, CampaignSummary, Group, ValueRow } from "@/features/campaigns/campaign-parts";
import { useAuth } from "@/features/auth/auth-provider";
import { CheckoutTerms } from "@/features/campaigns/explainers";
import { estimateReach, money, parseDollars, percent, reachRange } from "@/lib/format";
import { shareCampaign } from "@/lib/share";
import { goBackOr } from "@/lib/nav";
import { colors, fonts, radius, shadow, spacing, themed } from "@/theme";
import { PressScale } from "@/components/ui/motion";

type Step = "amount" | "review" | "pay" | "result";
const STEPS: Step[] = ["amount", "review", "pay", "result"];
const STEP_LABELS = ["Amount", "Review", "Pay"];

function newKey() {
  return `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export default function BackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaign = useCampaign(id);
  const config = useConfig();

  if (campaign.isPending || config.isPending) return <LoadingState />;
  if (campaign.isError) return <ErrorState error={campaign.error} onRetry={() => campaign.refetch()} />;
  if (config.isError) return <ErrorState error={config.error} onRetry={() => config.refetch()} />;
  return <Checkout c={campaign.data} config={config.data} />;
}

function Checkout({ c, config }: { c: PublicCampaign; config: PlatformConfig }) {
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { presetAmountsCents, minContributionCents, maxContributionCents } = config.funding;

  const [step, setStep] = useState<Step>("amount");
  const [amountCents, setAmountCents] = useState<number>(presetAmountsCents[1] ?? 2500);
  const [custom, setCustom] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  // No account needed to back. A guest can leave an email for the receipt; nothing else is asked
  const { isSignedIn } = useAuth();
  const [guestEmail, setGuestEmail] = useState("");
  const guestEmailError =
    !isSignedIn && guestEmail.trim() && !/^\S+@\S+\.\S+$/.test(guestEmail.trim()) ? "Enter a valid email, or leave it empty." : null;
  const [card, setCard] = useState("");
  const [useSaved, setUseSaved] = useState(true);
  const cardInput = useRef<TextInput>(null);
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [result, setResult] = useState<ContributionWithFunding | null>(null);
  const idempotencyKey = useRef(newKey());

  const fee = Math.round((amountCents * config.fees.platformFeePct) / 100);
  const processing = Math.round((amountCents * config.fees.processingFeePct) / 100);
  const reach = estimateReach(amountCents, c.funding.reachPerDollar, config.reach.estimateRangePct);
  const amountError =
    amountCents < minContributionCents
      ? `The minimum is ${money(minContributionCents)}.`
      : amountCents > maxContributionCents
        ? `The maximum is ${money(maxContributionCents)}.`
        : null;

  const create = useMutation({
    mutationFn: () =>
      contributionsApi.create({
        campaignId: c.id,
        amountCents,
        isPublic: isSignedIn && isPublic,
        idempotencyKey: idempotencyKey.current,
        ...(!isSignedIn && guestEmail.trim() ? { guestEmail: guestEmail.trim().toLowerCase() } : {}),
      }),
    onSuccess: (data) => {
      setContribution(data);
      setStep("pay");
    },
  });

  const confirm = useMutation({
    mutationFn: () => contributionsApi.confirm(contribution!.id, useSaved ? SAVED_CARD_TOKEN : card),
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
      Haptics.notificationAsync(
        data.status === "succeeded" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      invalidateFunding(qc);
    },
  });

  const cancel = useMutation({
    mutationFn: () => contributionsApi.cancel(contribution!.id),
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
      invalidateFunding(qc);
    },
  });

  // A settled payment can't be retried; a new attempt gets a new pending contribution
  const startOver = (to: Step) => {
    idempotencyKey.current = newKey();
    setContribution(null);
    setResult(null);
    setCard("");
    setUseSaved(true);
    create.reset();
    confirm.reset();
    setStep(to);
  };

  const stepIndex = STEPS.indexOf(step);
  const busy = create.isPending || confirm.isPending || cancel.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen
        options={{
          title: step === "result" ? "" : "Back this campaign",
          headerBackVisible: step !== "result",
          gestureEnabled: step !== "pay" || !confirm.isPending,
        }}
      />
      <Screen bottomInset={90 + insets.bottom}>
        {/* Step indicator */}
        {step !== "result" && (
          <View style={styles.steps}>
            {STEP_LABELS.map((label, i) => (
              <View key={label} style={styles.stepItem}>
                <StepBar filled={i <= stepIndex} />
                <Text
                  variant="caption"
                  color={i === stepIndex ? colors.primary : colors.textSubtle}
                  style={i === stepIndex ? { fontFamily: fonts.semibold } : null}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Campaign summary */}
        {step !== "result" && (
          <CampaignSummary
            title={c.title}
            imageUrl={c.squareImageUrl ?? c.coverImageUrl}
            raisedCents={c.funding.raisedCents}
            goalCents={c.funding.goalCents}
            percentFunded={c.funding.percentFunded}
          />
        )}

        {step === "amount" && (
          <View style={styles.stepBody}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="h2">Choose an amount</Text>
              <Text variant="bodySm">It pays for ads that show this message to more people. It is not a donation to the cause.</Text>
            </View>
            <View style={styles.presets}>
              {presetAmountsCents.map((p) => {
                const selected = !custom && amountCents === p;
                return (
                  <Pressable
                    key={p}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setCustom("");
                      setAmountCents(p);
                    }}
                    style={[styles.preset, selected && styles.presetSelected]}
                  >
                    <Text variant="h3" color={selected ? colors.textOnDark : colors.text}>
                      {money(p)}
                    </Text>
                    <Text variant="caption" color={selected ? "rgba(255,255,255,0.8)" : colors.textMuted}>
                      ~{reachRange(estimateReach(p, c.funding.reachPerDollar, config.reach.estimateRangePct))} people
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label="Or enter an amount"
              prefix="$"
              value={custom}
              onChangeText={(v) => {
                setCustom(v);
                const cents = parseDollars(v);
                if (cents !== null) setAmountCents(cents);
              }}
              keyboardType="decimal-pad"
              placeholder="e.g. 40"
              error={custom ? amountError : null}
              hint={`${money(minContributionCents)} to ${money(maxContributionCents)}`}
            />

            <Card style={{ gap: spacing.md }}>
              <View style={styles.reachRow}>
                <View style={styles.well}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="caption">Estimated reach of your contribution</Text>
                  <Text variant="h3" color={colors.primary}>
                    {reachRange(reach)} people
                  </Text>
                </View>
              </View>
              <Text variant="caption" color={colors.textSubtle}>
                {config.reach.disclaimer}
              </Text>
              <View style={styles.hairline} />
              {isSignedIn ? (
                <View style={styles.toggle}>
                  <View style={{ flex: 1 }}>
                    <Text variant="title">Show my name as a backer</Text>
                    <Text variant="caption">Off by default. If on, your first name and initial are shown.</Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.background}
                    accessibilityLabel="Show my name as a public backer"
                  />
                </View>
              ) : (
                <View style={styles.toggle}>
                  <Ionicons name="person-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">Backing as a guest</Text>
                    <Text variant="caption">No account needed, and your name is never shown.</Text>
                  </View>
                  <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push("/login")}>
                    <Text variant="title" color={colors.primary}>
                      Log in
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </View>
        )}

        {step === "review" && (
          <View style={styles.stepBody}>
            <Text variant="h2">Review</Text>
            <Card style={{ gap: spacing.xs }}>
              <ValueRow label="Contribution" value={money(amountCents)} />
              <ValueRow
                label="Goes to ads"
                value={money(amountCents - fee)}
                hint={`${100 - config.fees.platformFeePct}% of your contribution`}
                accent
              />
              <ValueRow label="Platform fee" value={money(fee)} hint={`${config.fees.platformFeePct}%: review, ad setup, reporting`} />
              <ValueRow label="Card processing" value={money(processing)} hint={`~${config.fees.processingFeePct}%, added on top`} />
              <View style={[styles.hairline, { marginVertical: spacing.sm }]} />
              <ValueRow label="Total" value={money(amountCents + processing)} strong />
              <View style={[styles.hairline, { marginVertical: spacing.sm }]} />
              <ValueRow label="Estimated reach" hint="Demo assumptions, not a guarantee" value={`${reachRange(reach)} people`} accent />
            </Card>
            <Text variant="bodySm">This pays for ads that carry the message to new people. It is not a donation to the cause.</Text>
            {!isSignedIn && (
              <TextField
                label="Email for your receipt (optional)"
                value={guestEmail}
                onChangeText={setGuestEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={guestEmailError}
                hint="Your receipt also stays on this phone. We only use this email to send it."
              />
            )}
            <Group>
              <AccordionRow icon="document-text-outline" title="Fees & refunds">
                <CheckoutTerms />
              </AccordionRow>
            </Group>
            {create.isError && (
              <ErrorLine>{create.error instanceof ApiError ? create.error.message : "Couldn't start the payment."}</ErrorLine>
            )}
          </View>
        )}

        {step === "pay" && contribution && (
          <View style={styles.stepBody}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="h2">Pay {money(contribution.breakdown.totalChargedCents)}</Text>
            </View>
            <TextField
              ref={cardInput}
              label="Card number"
              value={card}
              onChangeText={(v) => {
                // Typing a new card replaces the saved one
                setUseSaved(false);
                setCard(
                  v
                    .replace(/\D/g, "")
                    .slice(0, 16)
                    .replace(/(\d{4})(?=\d)/g, "$1 "),
                );
              }}
              keyboardType="number-pad"
              placeholder="1234 5678 9012 3456"
              autoComplete="off"
              right={<Ionicons name="card-outline" size={20} color={colors.textMuted} />}
            />
            <SavedCard
              selected={useSaved}
              onPress={() => {
                setUseSaved(true);
                setCard("");
              }}
            />
            <PressScale scaleTo={0.98}
              accessibilityRole="button"
              onPress={() => {
                setUseSaved(false);
                cardInput.current?.focus();
              }}
              style={({ pressed }) => [styles.addCard, pressed && { backgroundColor: colors.surface }]}
            >
              <Ionicons name="add" size={20} color={colors.textMuted} />
              <Text variant="title" color={colors.textMuted}>
                Add another card
              </Text>
            </PressScale>
            {confirm.isError && (
              <ErrorLine>
                {confirm.error instanceof ApiError ? confirm.error.message : "Couldn't reach the payment provider. You were not charged."}
              </ErrorLine>
            )}
          </View>
        )}

        {step === "result" && result && (
          <Result r={result} c={c} onRetry={() => startOver("review")} onChangeAmount={() => startOver("amount")} />
        )}
      </Screen>

      {/* Bottom actions */}
      {step !== "result" && (
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
          {step === "amount" && (
            <>
              <View style={{ flex: 1 }}>
                <Text variant="caption">{"You'll pay"}</Text>
                <Text variant="h3">{money(amountCents + processing)}</Text>
              </View>
              <Button label="Review" iconRight="arrow-forward" disabled={!!amountError} onPress={() => setStep("review")} />
            </>
          )}
          {step === "review" && (
            <>
              <Button label="Back" variant="ghost" onPress={() => setStep("amount")} />
              <Button
                label="Continue to payment"
                style={{ flex: 1 }}
                disabled={!!guestEmailError}
                loading={create.isPending}
                onPress={() => create.mutate()}
              />
            </>
          )}
          {step === "pay" && (
            <>
              <Button label="Cancel" variant="ghost" disabled={busy} loading={cancel.isPending} onPress={() => cancel.mutate()} />
              <Button
                label={confirm.isPending ? "Processing…" : `Pay ${money(contribution?.breakdown.totalChargedCents ?? 0)}`}
                icon="lock-closed"
                style={{ flex: 1 }}
                loading={confirm.isPending}
                disabled={(!useSaved && card.replace(/\D/g, "").length < 12) || busy}
                onPress={() => confirm.mutate()}
              />
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );

  function Result({
    r,
    c,
    onRetry,
    onChangeAmount,
  }: {
    r: ContributionWithFunding;
    c: PublicCampaign;
    onRetry: () => void;
    onChangeAmount: () => void;
  }) {
    if (r.status === "succeeded") {
      return (
        <View style={styles.result}>
          <ResultAnimation kind="success" />
          <View style={{ gap: spacing.sm }}>
            <Text variant="h1" align="center">
              {"You're amplifying this message"}
            </Text>
            <Text variant="body" align="center" color={colors.textMuted}>
              {money(r.breakdown.contributionCents)} toward “{r.campaign.title}”. {money(r.breakdown.adSpendCents)} goes into ads.
            </Text>
          </View>
          <Card style={{ gap: spacing.md, alignSelf: "stretch" }}>
            <View style={styles.resultRow}>
              <Text variant="bodySm">Funding now</Text>
              <Text variant="title" color={colors.primary}>
                {percent(r.campaignFunding.percentFunded)}
              </Text>
            </View>
            <ProgressBar value={r.campaignFunding.percentFunded} height={8} />
            <View style={styles.hairline} />
            <ValueRow label="Your estimated reach" value={`${reachRange(r.estimatedReach)} people`} />
            <ValueRow label="Receipt" value={r.receiptNumber} />
          </Card>
          <Text variant="caption" align="center">
            {r.isGuest
              ? "Your receipt is saved on this phone. Create an account to follow this campaign and get its updates and final report."
              : "You now follow this campaign and will hear about milestones, updates and the final report."}
          </Text>
          <View style={styles.resultActions}>
            <Button label="Share the campaign" icon="share-social-outline" block onPress={() => shareCampaign(c)} />
            <Button
              label="View receipt"
              variant="ghost"
              block
              onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: r.id } })}
            />
            <Button
              label="Done"
              variant="ghost"
              block
              onPress={() => {
                toast("Thank you for backing!");
                goBackOr({ pathname: "/campaign/[id]", params: { id: c.slug ?? c.id } });
              }}
            />
          </View>
        </View>
      );
    }
    const cancelled = r.status === "cancelled";
    return (
      <View style={styles.result}>
        <ResultAnimation kind="failure" />
        <View style={{ gap: spacing.sm }}>
          <Text variant="h1" align="center">
            {cancelled ? "Payment cancelled" : r.status === "rejected" ? "Payment declined" : "Payment didn't go through"}
          </Text>
          <Text variant="body" align="center" color={colors.textMuted}>
            {cancelled ? "No payment was made." : (r.failureReason ?? "You were not charged.")}
          </Text>
        </View>
        <View style={styles.resultActions}>
          {!cancelled && <Button label="Try again" icon="refresh" block onPress={onRetry} />}
          <Button label="Change amount" variant="secondary" block onPress={onChangeAmount} />
          <Button
            label="Back to campaign"
            variant="ghost"
            block
            onPress={() => goBackOr({ pathname: "/campaign/[id]", params: { id: c.slug ?? c.id } })}
          />
        </View>
      </View>
    );
  }
}

// The dummy provider approves its 4242 test card. The demo account's saved card stands in for it,
// so the screen shows a realistic card while the server still gets the test number.
const SAVED_CARD_TOKEN = "4242 4242 4242 4242";

/** Saved card row: brand, masked number, expiry, and a radio mark when selected. */
function SavedCard({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  return (
    <PressScale scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityLabel="Saved Visa card ending 8461"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.savedCard, selected && styles.savedCardSelected, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.brand}>
        <Text variant="caption" color={colors.textOnDark} style={{ fontFamily: fonts.bold, fontStyle: "italic", letterSpacing: 0.5 }}>
          VISA
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title">•••• •••• •••• 8461</Text>
        <Text variant="caption">Expires 09/29</Text>
      </View>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? colors.primary : colors.textSubtle} />
    </PressScale>
  );
}

/** One step segment; the violet fill slides in when the step is reached. */
function StepBar({ filled }: { filled: boolean }) {
  const progress = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(filled ? 1 : 0, { duration: 450 }));
  }, [filled, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={styles.stepBar}>
      <Animated.View style={[styles.stepFill, fill]} />
    </View>
  );
}

/** Inline error under a step, in the danger colour. */
function ErrorLine({ children }: { children: string }) {
  return (
    <View style={styles.errorLine}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text variant="bodySm" color={colors.danger} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    steps: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
    stepItem: { flex: 1, gap: 6 },
    stepBar: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
    stepFill: { height: "100%", borderRadius: 2, backgroundColor: colors.primary },
    savedCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    savedCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
    brand: { width: 48, height: 32, borderRadius: 6, backgroundColor: "#1A1F71", alignItems: "center", justifyContent: "center" },
    addCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 56,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.textSubtle,
    },
    stepBody: { gap: spacing.lg, marginTop: spacing.xxl },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    preset: {
      width: "47%",
      flexGrow: 1,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 2,
    },
    presetSelected: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.raised },
    reachRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    well: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    toggle: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    errorLine: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    result: { alignItems: "center", gap: spacing.lg },
    resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    resultActions: { alignSelf: "stretch", gap: spacing.sm },
  }),
);
