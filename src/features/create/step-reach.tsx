// Reach: who the message is for, where it runs, how the ad budget is split and how long funding lasts.
// The creator's choices are clearly separated from what the platform finalises during review.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import type { Channel, PlatformConfig } from "@/api/types";
import { Card, Chip, RangeSlider, Text } from "@/components/ui";
import { CHANNEL, type IconName } from "@/lib/labels";
import { colors, radius, shadow, spacing, themed } from "@/theme";
import { FieldGroup, FormSection, StepIntro, Stepper, TagInput } from "./form-parts";
import type { DraftForm, FieldErrors } from "./use-draft";

type Props = {
  form: DraftForm;
  set: <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => void;
  errors: FieldErrors;
  config: PlatformConfig;
};

const INTEREST_SUGGESTIONS = [
  "Parents",
  "Education",
  "Public health",
  "Local news",
  "Environment",
  "Volunteering",
  "Civic engagement",
  "Students",
];

export function StepReach({ form, set, errors, config }: Props) {
  const r = form.reach;
  const setReach = (patch: Partial<DraftForm["reach"]>) => set("reach", { ...r, ...patch });

  const toggleChannel = (ch: Channel) => {
    const channels = r.channels.includes(ch) ? r.channels.filter((c) => c !== ch) : [...r.channels, ch];
    // Keep the split valid: one channel takes 100%, two start at an even split
    const budgetSplit: DraftForm["reach"]["budgetSplit"] =
      channels.length === 1 ? { [channels[0]!]: 100 } : channels.length === 2 ? { facebook: 50, instagram: 50 } : {};
    setReach({ channels, budgetSplit });
  };

  const fb = r.budgetSplit.facebook ?? 0;
  const ageMin = r.ageMin ?? 18;
  const ageMax = r.ageMax ?? 65;

  return (
    <View style={{ gap: spacing.xl }}>
      <StepIntro title="Reach" body="Who should see it. The platform turns this into ad targeting." />

      <FormSection label="Audience">
        <FieldGroup title="Locations" required hint="Cities, regions or countries." error={errors.locations}>
          <TagInput
            values={r.locations}
            onChange={(locations) => setReach({ locations })}
            placeholder="Add a location, e.g. Austin"
          />
        </FieldGroup>

        <FieldGroup title="Age range" error={errors.age}>
          <View style={styles.ageHead}>
            <Text variant="h3" color={colors.primary}>
              {ageMin} – {ageMax >= 65 ? "65+" : ageMax}
            </Text>
            <Text variant="caption">years</Text>
          </View>
          <RangeSlider
            label="Age range"
            min={13}
            max={65}
            low={ageMin}
            high={ageMax}
            onChange={(lo, hi) => setReach({ ageMin: lo, ageMax: hi })}
          />
          <View style={styles.ageScale}>
            <Text variant="caption">13</Text>
            <Text variant="caption">65+</Text>
          </View>
        </FieldGroup>

        <FieldGroup title="Interests" hint="Optional. Broad topics your audience cares about.">
          <TagInput
            values={r.interests}
            onChange={(interests) => setReach({ interests })}
            placeholder="Add an interest"
            suggestions={INTEREST_SUGGESTIONS}
          />
        </FieldGroup>
      </FormSection>

      <FormSection label="Distribution">
        <FieldGroup title="Channels" required error={errors.channels}>
          <View style={{ gap: spacing.sm }}>
            {config.channels.map((ch) => {
              const meta = CHANNEL[ch]!;
              const on = r.channels.includes(ch);
              return (
                <Pressable
                  key={ch}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleChannel(ch)}
                  style={[styles.channel, on && styles.channelOn]}
                >
                  <Ionicons name={meta.icon} size={24} color={meta.color} />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">{meta.label}</Text>
                    <Text variant="caption">Feed placements</Text>
                  </View>
                  <Ionicons
                    name={on ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={on ? colors.primary : colors.textSubtle}
                  />
                </Pressable>
              );
            })}
          </View>
        </FieldGroup>

        {r.channels.length === 2 && (
          <FieldGroup
            title="Ad budget split"
            hint="How the advertising budget is divided between channels."
            error={errors.budgetSplit}
          >
            <View style={styles.split}>
              <View style={[styles.splitBar, { flex: Math.max(fb, 1), backgroundColor: colors.blue }]} />
              <View style={[styles.splitBar, { flex: Math.max(100 - fb, 1), backgroundColor: colors.coral }]} />
            </View>
            <View style={styles.splitRow}>
              <View style={{ gap: 4 }}>
                <Text variant="caption">Facebook</Text>
                <Stepper
                  label="Facebook share"
                  value={fb}
                  min={0}
                  max={100}
                  step={10}
                  suffix="%"
                  onChange={(v) => setReach({ budgetSplit: { facebook: v, instagram: 100 - v } })}
                />
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text variant="caption">Instagram</Text>
                <Text variant="h3">{100 - fb}%</Text>
              </View>
            </View>
          </FieldGroup>
        )}

        <FieldGroup title="Funding period" hint="How long backers can contribute. Promotion starts after funding closes.">
          <View style={styles.wrap}>
            {config.funding.durationDays.map((d) => (
              <Chip key={d} label={`${d} days`} selected={form.durationDays === d} onPress={() => set("durationDays", d)} />
            ))}
          </View>
        </FieldGroup>
      </FormSection>

      {/* Audience preview */}
      <Card style={{ gap: spacing.md }}>
        <Text variant="overline" color={colors.textMuted}>
          Audience preview
        </Text>
        <Text variant="body">
          People aged{" "}
          <Text variant="body" style={styles.em}>
            {ageMin}–{ageMax}
          </Text>{" "}
          in{" "}
          <Text variant="body" style={styles.em}>
            {r.locations.length ? r.locations.join(", ") : "your chosen locations"}
          </Text>
          {r.interests.length ? (
            <>
              {" "}
              interested in{" "}
              <Text variant="body" style={styles.em}>
                {r.interests.slice(0, 4).join(", ")}
              </Text>
            </>
          ) : null}
          , seeing your ad in their{" "}
          <Text variant="body" style={styles.em}>
            {r.channels.length ? r.channels.map((c) => CHANNEL[c]?.label).join(" and ") : "chosen"}
          </Text>{" "}
          feed.
        </Text>
        <Text variant="caption">
          Audience size is never promised. Actual reach depends on ad inventory, prices, targeting, delivery and performance.
        </Text>
      </Card>

      <View>
        <Text variant="overline" color={colors.textMuted} style={{ marginBottom: spacing.md }}>
          Who decides what
        </Text>
        <Card style={styles.decide}>
          <Decider
            icon="person"
            tint={colors.primary}
            bg={colors.primarySoft}
            title="You choose"
            items={["Locations", "Age range", "Interests", "Channels", "Budget split", "Funding period"]}
          />
          <View style={styles.decideDivider} />
          <Decider
            icon="shield-checkmark"
            tint={colors.blue}
            bg={colors.blueSoft}
            title="Platform finalises"
            items={["Exact targeting", "Feed placements", "Bids & pacing", "Ad schedule", "Policy checks"]}
          />
        </Card>
      </View>
    </View>
  );
}

function Decider({ icon, tint, bg, title, items }: { icon: IconName; tint: string; bg: string; title: string; items: string[] }) {
  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <View style={[styles.decideIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text variant="title">{title}</Text>
      <View style={{ gap: spacing.sm }}>
        {items.map((t) => (
          <View key={t} style={styles.decideItem}>
            <Ionicons name="checkmark-circle" size={16} color={tint} />
            <Text variant="bodySm" color={colors.text} style={{ flex: 1 }}>
              {t}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  ageHead: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  ageScale: { flexDirection: "row", justifyContent: "space-between", marginTop: -4, paddingHorizontal: 4 },
  decide: { flexDirection: "row", gap: spacing.lg },
  decideDivider: { width: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border },
  decideIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  decideItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  ageRow: { flexDirection: "row", gap: spacing.xl },
  channel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 64,
  },
  channelOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  split: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 },
  splitBar: { height: "100%" },
  splitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  em: { fontFamily: "Rubik_600SemiBold", color: colors.primary },
  table: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1, gap: 6, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, ...shadow.card },
  colHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
}));
