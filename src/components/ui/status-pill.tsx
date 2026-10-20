import { StyleSheet, View } from "react-native";
import type { CampaignStatus } from "@/api/types";
import { STATUS, TONE } from "@/lib/labels";
import { radius, themed } from "@/theme";
import { Text } from "./text";

type Tone = keyof typeof TONE;

export function Pill({ label, tone = "primary" }: { label: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.fg }]} />
      <Text variant="caption" color={t.fg} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

export function StatusPill({ status }: { status: CampaignStatus }) {
  const s = STATUS[status];
  return <Pill label={s.label} tone={s.tone} />;
}

const styles = themed(() => StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: "Rubik_500Medium" },
}));
