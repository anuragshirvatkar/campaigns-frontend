// "Did the visuals make you keep reading?" / "Did this change your mind?" with No / Somewhat / Yes pills.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { engageApi } from "@/api/engage";
import type { FeedbackAnswer, PublicCampaign } from "@/api/types";
import { Card, Text, useToast } from "@/components/ui";
import { useRequireAuth } from "@/features/auth/use-require-auth";
import { colors, radius, spacing, themed } from "@/theme";

const OPTIONS: { value: FeedbackAnswer; label: string }[] = [
  { value: "no", label: "No" },
  { value: "somewhat", label: "Somewhat" },
  { value: "yes", label: "Yes" },
];

export function FeedbackCard({ campaign }: { campaign: PublicCampaign }) {
  const qc = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const current = campaign.viewer?.feedback;

  const save = useMutation({
    mutationFn: (body: { visualsAnswer?: FeedbackAnswer; changedMindAnswer?: FeedbackAnswer }) => engageApi.feedback(campaign.id, body),
    onSuccess: (saved) => {
      qc.setQueriesData<PublicCampaign>({ queryKey: ["campaign"] }, (old) =>
        old && old.id === campaign.id && old.viewer ? { ...old, viewer: { ...old.viewer, feedback: saved } } : old,
      );
      toast("Thanks for your feedback");
    },
    onError: () => toast("Couldn't save your answer. Try again.", "error"),
  });

  const question = (label: string, field: "visualsAnswer" | "changedMindAnswer") => (
    <View style={{ gap: spacing.md }}>
      <Text variant="title">{label}</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const selected = current?.[field] === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${o.label}`}
              onPress={() =>
                requireAuth(() => {
                  Haptics.selectionAsync().catch(() => {});
                  save.mutate({ [field]: o.value });
                })
              }
              style={[styles.option, selected && styles.selected]}
            >
              <Text variant="title" color={selected ? colors.textOnDark : colors.text} style={{ fontSize: 14 }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <Card style={{ gap: spacing.xl }}>
      {question("Did the visuals make you want to keep reading?", "visualsAnswer")}
      {question("Did this message change your mind?", "changedMindAnswer")}
      <Text variant="caption">Anonymous. It helps the creator improve the message.</Text>
    </Card>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  option: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  selected: { backgroundColor: colors.primary },
}));
