import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "@/components/ui/alert-dialog";
import { useCampaign, useFollowToggle, useUpdates } from "@/api/queries";
import type { PublicCampaign } from "@/api/types";
import { Button, CampaignPageSkeleton, Card, EmptyState, ErrorState, IconButton, ProgressBar, StatusPill, Text } from "@/components/ui";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { AccordionRow, campaignStyles, Group, LinkRow, SectionLabel } from "@/features/campaigns/campaign-parts";
import { AudienceAndDistribution, ReviewProcess, UseOfFunds } from "@/features/campaigns/explainers";
import { FeedbackCard } from "@/features/campaigns/feedback-card";
import { SourceList, StoryBlocks } from "@/features/campaigns/story";
import { money, percent, reachRange, timeAgo, timeLeftShort } from "@/lib/format";
import { CATEGORY, CHANNEL, STATUS } from "@/lib/labels";
import { shareCampaign } from "@/lib/share";
import { colors, fonts, radius, shadow, spacing, themed, dk } from "@/theme";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.navigate("/explore");
}

export default function CampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCampaign(id);
  const insets = useSafeAreaInsets();

  if (query.isPending) {
    return (
      <View style={styles.screen}>
        <CampaignPageSkeleton />
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          <IconButton icon="arrow-back" label="Back" variant="floating" onPress={goBack} />
        </View>
      </View>
    );
  }
  if (query.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <IconButton icon="arrow-back" label="Back" onPress={goBack} />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </View>
    );
  }
  return <CampaignView c={query.data} />;
}

const COVER_H = 300;
// The tab body starts this far below the inline tab bar's top (bar + padding)
const TABS_BODY_TOP = 88;
const TABS = ["Story", "Sources", "Updates", "Feedback"] as const;
type Tab = (typeof TABS)[number];
// The inline bar has more space above it than the pinned copy; pin when the two line up exactly
const PIN_SHIFT = spacing.xxl - spacing.sm;

function CampaignView({ c }: { c: PublicCampaign }) {
  const insets = useSafeAreaInsets();
  const requireAuth = useRequireAuth();
  const follow = useFollowToggle(c);
  const updates = useUpdates(c.id);
  const [tab, setTab] = useState<Tab>("Story");
  const cat = c.category ? CATEGORY[c.category] : null;
  const isOwner = !!c.viewer?.isOwner;
  const hasReport = c.status === "promoting" || c.status === "completed";
  const funding = c.status === "funding";
  const channels = c.reach.channels?.length
    ? c.reach.channels.map((ch) => CHANNEL[ch]?.label ?? ch).join(" and ")
    : "Facebook and Instagram";

  // Status bar backdrop fades in once the cover image scrolls away
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COVER_H - 120, COVER_H - 40], [0, 1], "clamp"),
  }));

  // Tabs: once the inline tab bar scrolls under the status bar, a pinned copy takes its place at the top
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const tabsY = useSharedValue(Number.MAX_SAFE_INTEGER);
  const pinnedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value >= tabsY.value + PIN_SHIFT - insets.top ? 0 : -400 }],
  }));
  // "How your money is used": open Story and scroll to its Before-you-back card
  const fundsY = useRef(0);
  const showFunds = () => {
    setTab("Story");
    requestAnimationFrame(() =>
      scroller.current?.scrollTo({ y: tabsY.get() + TABS_BODY_TOP + fundsY.current - insets.top - 70, animated: true }),
    );
  };
  const pick = (t: Tab) => {
    setTab(t);
    // Start the new tab at its top if the reader had scrolled into the old one
    const top = tabsY.get() + PIN_SHIFT - insets.top;
    if (scrollY.get() > top) scroller.current?.scrollTo({ y: top, animated: false });
  };

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {/* Cover */}
        <View>
          <Image
            source={c.coverImageUrl ? { uri: c.coverImageUrl } : null}
            style={styles.cover}
            contentFit="cover"
            transition={200}
            accessibilityLabel="Campaign cover image"
          />
          <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
            <IconButton icon="arrow-back" label="Back" variant="floating" onPress={goBack} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {c.viewer && !isOwner && (
                <FollowButton following={c.viewer.isFollowing} onPress={() => follow.mutate(!c.viewer!.isFollowing)} />
              )}
              {!c.viewer && <FollowButton following={false} onPress={() => requireAuth(() => {})} />}
              <IconButton icon="share-social-outline" label="Share campaign" variant="floating" onPress={() => shareCampaign(c)} />
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          {/* Title */}
          <View style={styles.metaRow}>
            {cat && (
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={13} color={cat.tint} />
                <Text variant="caption" color={cat.tint} style={{ fontFamily: fonts.semibold }}>
                  {cat.label}
                </Text>
              </View>
            )}
            <StatusPill status={c.status} />
          </View>
          <Text variant="h1" accessibilityRole="header" style={{ marginTop: spacing.md }}>
            {c.title}
          </Text>

          {/* Funding */}
          <View>
            <Card style={styles.funding}>
              <View style={styles.fundingTop}>
                <View style={{ flex: 1 }}>
                  <Text variant="number">{money(c.funding.raisedCents)}</Text>
                  <Text variant="caption">raised of {money(c.funding.goalCents)}</Text>
                </View>
                <Text variant="h2" color={colors.primary}>
                  {percent(c.funding.percentFunded)}
                </Text>
              </View>
              <ProgressBar value={c.funding.percentFunded} height={8} label="Funding progress" />
              <View style={styles.facts}>
                <Fact value={String(c.funding.backerCount)} label="backers" />
                <View style={styles.factDivider} />
                <Fact
                  value={funding ? (timeLeftShort(c.funding.deadline) ?? "—") : STATUS[c.status].label}
                  label={funding ? "left" : "status"}
                />
                <View style={styles.factDivider} />
                <Fact
                  value={reachRange(c.funding.estimatedReachAtGoal)}
                  label="reach at goal"
                  info={() =>
                    showAlert(
                      "Estimated reach",
                      `About ${Math.round(c.funding.reachPerDollar)} people per $1, from the prototype's demo assumptions. It's an estimate, not a guarantee.`,
                    )
                  }
                />
              </View>
            </Card>
          </View>
          <Pressable accessibilityRole="button" onPress={showFunds} hitSlop={8} style={styles.fundsLink}>
            <Ionicons name="wallet-outline" size={16} color={colors.primary} />
            <Text variant="title" color={colors.primary} style={{ fontSize: 14 }}>
              How your money is used
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
          {!funding && (
            <Text variant="bodySm" style={{ marginTop: spacing.md }}>
              {STATUS[c.status].explain}
            </Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap} onLayout={(e) => tabsY.set(e.nativeEvent.layout.y)}>
          <TabBar tab={tab} onPick={pick} />
        </View>

        <View style={styles.tabBody}>
          {tab === "Story" && (
            <>
              {c.story.headline && (
                <Text variant="h2" style={{ fontFamily: fonts.bold }}>
                  {c.story.headline}
                </Text>
              )}
              {c.story.intro && (
                <Text variant="article" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
                  {c.story.intro}
                </Text>
              )}
              <StoryBlocks blocks={c.story.blocks} sources={c.sources} statIcon={cat?.icon} />
              {c.whyItMatters && (
                <View style={styles.why}>
                  <Text variant="overline" color={colors.textMuted}>
                    Why it matters
                  </Text>
                  <Text variant="article">{c.whyItMatters}</Text>
                </View>
              )}

              {/* The required explanations, closed until needed */}
              <View style={campaignStyles.section} onLayout={(e) => (fundsY.current = e.nativeEvent.layout.y)}>
                <SectionLabel>Before you back</SectionLabel>
                <Group>
                  <AccordionRow icon="wallet-outline" title="Use of funds">
                    <UseOfFunds c={c} />
                  </AccordionRow>
                  <AccordionRow icon="locate-outline" title="Audience & distribution">
                    <AudienceAndDistribution c={c} />
                  </AccordionRow>
                  <AccordionRow icon="shield-checkmark-outline" title="Review & verification">
                    <ReviewProcess />
                    <Text variant="bodySm" color={colors.text} style={{ marginTop: spacing.md }}>
                      Sources are provided by the creator and listed in Sources so you can check them yourself. No trust score is
                      calculated.
                    </Text>
                  </AccordionRow>
                  <AccordionRow icon="git-network-outline" title="Distribution partners">
                    <Text variant="bodySm" color={colors.text}>
                      Ads run on {channels} placements, bought and managed by the platform. In this prototype, delivery is simulated.
                    </Text>
                  </AccordionRow>
                </Group>
              </View>
            </>
          )}

          {tab === "Sources" && (
            <>
              <Text variant="bodySm" style={{ marginBottom: spacing.lg }}>
                The evidence behind the story, provided by the creator. Tap one to open it.
              </Text>
              <Card padded={false} style={{ overflow: "hidden" }}>
                <SourceList sources={c.sources} />
              </Card>
            </>
          )}

          {tab === "Updates" &&
            ((updates.data?.length ?? 0) > 0 ? (
              <Group>
                {updates.data!.map((u) => (
                  <View key={u.id} style={styles.update}>
                    <View style={styles.updateHead}>
                      <Text variant="title" style={{ flex: 1 }}>
                        {u.title}
                      </Text>
                      <Text variant="caption">{timeAgo(u.createdAt)}</Text>
                    </View>
                    <Text variant="bodySm" color={colors.text}>
                      {u.body}
                    </Text>
                  </View>
                ))}
              </Group>
            ) : (
              <EmptyState
                compact
                icon="newspaper-outline"
                title="No updates yet"
                body="When the creator posts news about this campaign, it shows up here."
              />
            ))}

          {tab === "Feedback" && (
            <>
              <FeedbackCard campaign={c} />
              <View style={campaignStyles.section}>
                <SectionLabel>Discussion</SectionLabel>
                <Group>
                  <LinkRow
                    icon="chatbubbles-outline"
                    title={`Comments (${c.counts.comments})`}
                    detail="Discuss the message and its sources"
                    onPress={() => router.push({ pathname: "/campaign/[id]/comments", params: { id: c.id } })}
                  />
                </Group>
              </View>
            </>
          )}
        </View>
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[styles.shade, { height: insets.top }, shadeStyle]} />
      <Animated.View style={[styles.pinned, { top: insets.top }, pinnedStyle]}>
        <TabBar tab={tab} onPick={pick} />
      </Animated.View>

      {/* Sticky action bar: funding stays reachable without covering the story */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {isOwner ? (
          <Button
            label="Manage campaign"
            icon="settings-outline"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: "/manage/[id]", params: { id: c.id } })}
          />
        ) : funding ? (
          <Button
            label={c.viewer?.hasBacked ? "Back again" : "Back this campaign"}
            icon="megaphone-outline"
            pulse
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: "/campaign/[id]/back", params: { id: c.slug ?? c.id } })}
          />
        ) : hasReport ? (
          <Button
            label={c.status === "completed" ? "View final report" : "View live delivery"}
            icon="bar-chart-outline"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: "/campaign/[id]/report", params: { id: c.slug ?? c.id } })}
          />
        ) : (
          <Button
            label="Share campaign"
            icon="share-social-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => shareCampaign(c)}
          />
        )}
      </View>
    </View>
  );
}

/** Segmented tabs, the same style as Activity's Notifications / Following switch. */
function TabBar({ tab, onPick }: { tab: Tab; onPick: (t: Tab) => void }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {TABS.map((t) => (
        <Pressable
          key={t}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === t }}
          onPress={() => onPick(t)}
          style={[styles.segmentItem, tab === t && styles.segmentActive]}
        >
          <Text
            variant="title"
            color={tab === t ? colors.primary : colors.textMuted}
            style={{ fontSize: 14, fontFamily: tab === t ? fonts.semibold : fonts.medium }}
            numberOfLines={1}
          >
            {t}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Fact({ value, label, info }: { value: string; label: string; info?: () => void }) {
  return (
    <Pressable style={styles.fact} disabled={!info} onPress={info} accessibilityRole={info ? "button" : undefined} hitSlop={6}>
      <Text variant="title" numberOfLines={1}>
        {value}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Text variant="caption" numberOfLines={1}>
          {label}
        </Text>
        {info && <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    cover: { width: "100%", height: COVER_H, backgroundColor: colors.primarySoft },
    shade: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.background },
    topBar: { position: "absolute", left: spacing.lg, right: spacing.lg, flexDirection: "row", justifyContent: "space-between" },
    sheet: {
      marginTop: -24,
      borderTopLeftRadius: radius.xl + 6,
      borderTopRightRadius: radius.xl + 6,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
    },
    metaRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", flexWrap: "wrap" },
    catBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    creator: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
    funding: { gap: spacing.md, marginTop: spacing.xl },
    fundingTop: { flexDirection: "row", alignItems: "flex-end" },
    fundsLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginTop: spacing.md,
      minHeight: 32,
    },
    facts: { flexDirection: "row", alignItems: "center", paddingTop: spacing.xs },
    fact: { flex: 1, alignItems: "center", gap: 2 },
    factDivider: { width: StyleSheet.hairlineWidth * 2, height: 28, backgroundColor: colors.border },
    // Transparent so the funding card's bottom shadow above stays visible
    tabsWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.sm },
    tabBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    pinned: {
      position: "absolute",
      left: 0,
      right: 0,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: colors.primaryTint,
      borderRadius: radius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.primarySoft,
    },
    segmentItem: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      paddingHorizontal: 2,
    },
    segmentActive: {
      backgroundColor: colors.card,
      shadowColor: "#4B44A8",
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    why: {
      marginTop: spacing.xl,
      paddingLeft: spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryMuted,
      gap: spacing.xs,
    },
    update: { padding: spacing.lg, gap: spacing.xs },
    updateHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    actionBar: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
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
      ...shadow.card,
    },
  }),
);

/** Floating Follow / Following pill on the cover image. Following = notified of milestones, updates and the report. */
function FollowButton({ following, onPress }: { following: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? "Following. Tap to unfollow" : "Follow this campaign"}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [followStyles.pill, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={following ? "checkmark" : "add"} size={17} color={colors.text} />
      <Text variant="title" color={colors.text} style={{ fontSize: 14 }}>
        {following ? "Following" : "Follow"}
      </Text>
    </Pressable>
  );
}

const followStyles = themed(() =>
  StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: dk("rgba(255,255,255,0.94)", "rgba(26,27,48,0.94)"), // same as the floating Back / Share buttons
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
  }),
);
