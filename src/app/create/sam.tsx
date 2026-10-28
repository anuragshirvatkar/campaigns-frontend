// "Create with Sam": while Sam collects the three answers (what it's about, who it should reach, why it
// matters) this is the only thing on screen, so one thing happens at a time. Once all three are in, the
// draft is written here and the editor opens, with Sam carrying on.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { Button, IconButton, Text, useToast } from "@/components/ui";
import { clearIntake, stopSamNow, useIntake } from "@/features/assistant/bridge";
import { draftFromText } from "@/features/create/draft-from-text";
import { goBackOr } from "@/lib/nav";
import { colors, fonts, radius, spacing, themed } from "@/theme";

const SAM_IMAGE = require("../../../assets/images/sam.png");

const QUESTIONS = [
  { key: "about", label: "What it's about", icon: "megaphone-outline" },
  { key: "audience", label: "Who it should reach", icon: "people-outline" },
  { key: "why", label: "Why it matters", icon: "heart-outline" },
] as const;

export default function CreateWithSam() {
  const qc = useQueryClient();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { idea, draft } = useIntake();
  const leavingForEditor = useRef(false);

  const build = useMutation({
    mutationFn: (text: string) => draftFromText(text),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      leavingForEditor.current = true;
      clearIntake();
      router.replace({ pathname: "/create/[id]", params: { id: c.id } });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't write the draft. Try again.", "error"),
  });

  // All three answers are in: write the draft right away
  const { mutate } = build;
  useEffect(() => {
    if (draft) mutate(draft);
  }, [draft, mutate]);

  // Leaving before the draft exists cancels the whole thing: Sam stops and forgets the answers
  const exit = () => {
    stopSamNow();
    clearIntake();
    goBackOr("/create");
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      exit();
      return true;
    });
    return () => {
      sub.remove();
      if (!leavingForEditor.current) {
        stopSamNow();
        clearIntake();
      }
    };
  }, []);

  const writing = !!draft || build.isPending;
  const answers = idea ?? { about: "", audience: "", why: "" };
  const next = QUESTIONS.find((q) => !answers[q.key].trim());

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.lg }]}>
      <Stack.Screen
        options={{
          title: "Create with Sam",
          gestureEnabled: false,
          headerLeft: () => <IconButton icon="close" label="Exit creating with Sam" onPress={exit} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn.duration(250)} style={styles.hero}>
          <Image source={SAM_IMAGE} style={styles.avatar} contentFit="contain" />
          <Text style={styles.title}>{writing ? "Writing your draft…" : "Tell Sam about your campaign"}</Text>
          <Text variant="body" align="center" color={colors.textMuted}>
            {writing
              ? "Sam is turning your answers into a full campaign. The editor opens in a moment."
              : "Answer Sam's three questions. Tap him to talk, or double-tap to type."}
          </Text>
          {writing && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />}
        </Animated.View>

        <View style={styles.list}>
          {QUESTIONS.map((q, i) => {
            const answer = answers[q.key].trim();
            const current = !writing && next?.key === q.key;
            return (
              <Animated.View
                key={q.key}
                entering={FadeInDown.delay(80 * i).duration(260)}
                style={[styles.row, current && styles.rowCurrent, !!answer && styles.rowDone]}
              >
                <View style={[styles.icon, !!answer && styles.iconDone]}>
                  <Ionicons name={answer ? "checkmark" : q.icon} size={18} color={answer ? "#FFFFFF" : colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.label}>{q.label}</Text>
                  <Text variant="bodySm" color={answer ? colors.text : colors.textSubtle} numberOfLines={3}>
                    {answer || (current ? "Sam is asking about this now" : writing ? "From what you told Sam" : "Waiting")}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {build.isError && !build.isPending && (
          <Button label="Try writing the draft again" icon="refresh" block onPress={() => draft && build.mutate(draft)} />
        )}
      </ScrollView>

      {!writing && <Button label="Exit" variant="ghost" block onPress={exit} style={{ marginHorizontal: spacing.xl }} />}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.xl, gap: spacing.xl },
    hero: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.lg },
    avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.sm },
    title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: "center" },
    list: { gap: spacing.md },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    rowCurrent: { borderColor: colors.primary },
    rowDone: { borderColor: colors.primarySoft },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },
    iconDone: { backgroundColor: colors.primary },
    label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  }),
);
