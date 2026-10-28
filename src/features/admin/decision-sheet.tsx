// Bottom sheet for "Ask for changes" and "Reject": a note to the creator and, for changes, the
// list of things to fix, each tied to the creation step where the creator fixes it.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AiSuggestion, ReviewInput } from "@/api/types";
import { Button, Text, TextField } from "@/components/ui";
import { colors, fonts, radius, spacing, themed } from "@/theme";
import { toneColors } from "./admin-parts";

export const STEP_NAMES = ["Basics", "Story", "Visuals", "Reach", "Submit"];

type Issue = { key: number; step: number; message: string };
let nextKey = 1;

type Props = {
  decision: "changes_requested" | "rejected" | null;
  suggestion: AiSuggestion | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: ReviewInput) => void;
};

export function DecisionSheet(props: Props) {
  return (
    <Modal
      visible={props.decision !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={props.onClose}
    >
      {props.decision !== null && <SheetBody key={props.decision} {...props} decision={props.decision} />}
    </Modal>
  );
}

function SheetBody({ decision, suggestion, busy, error, onClose, onSubmit }: Props & { decision: NonNullable<Props["decision"]> }) {
  const insets = useSafeAreaInsets();
  // The form mounts each time the sheet opens: it starts from the AI's notes when it reached the same decision
  const same = suggestion && suggestion.decision === decision ? suggestion : null;
  const [note, setNote] = useState(same && decision === "rejected" ? (same.issues[0]?.message ?? "") : "");
  const [issues, setIssues] = useState<Issue[]>(() =>
    decision === "changes_requested" ? (same?.issues ?? []).map((i) => ({ key: nextKey++, step: i.step, message: i.message })) : [],
  );
  const [tried, setTried] = useState(false);
  const isChanges = decision === "changes_requested";

  const filled = issues.filter((i) => i.message.trim());
  const missing = isChanges ? !note.trim() && filled.length === 0 : !note.trim();
  const tone = toneColors(isChanges ? "warning" : "danger");

  const submit = () => {
    setTried(true);
    if (missing) return;
    onSubmit({
      decision,
      note: note.trim() || undefined,
      issues: isChanges ? filled.map((i) => ({ step: i.step, message: i.message.trim() })) : [],
    });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.bottom} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
        >
          <View style={styles.grabber} />
          <View style={styles.head}>
            <View style={[styles.headIcon, { backgroundColor: tone.bg }]}>
              <Ionicons name={isChanges ? "create" : "close-circle"} size={22} color={tone.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">{isChanges ? "Ask for changes" : "Reject campaign"}</Text>
              <Text variant="caption">
                {isChanges ? "The creator edits the campaign and resubmits it." : "The campaign can't be resubmitted after this."}
              </Text>
            </View>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            <TextField
              label={isChanges ? "Note to the creator" : "Reason"}
              placeholder={
                isChanges ? "e.g. Nearly there. A couple of fixes before it can go live." : "e.g. Personal purchases can't be campaigns."
              }
              value={note}
              onChangeText={setNote}
              multiline
              minLines={3}
              maxLength={600}
              error={tried && missing ? (isChanges ? "Add a note or at least one thing to fix." : "Tell the creator why.") : null}
            />

            {isChanges && (
              <View style={{ gap: spacing.sm }}>
                <Text variant="title" style={{ fontSize: 14 }}>
                  What to fix
                </Text>
                {issues.map((issue) => (
                  <Animated.View
                    key={issue.key}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    layout={LinearTransition.duration(200)}
                    style={styles.issue}
                  >
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>
                      {STEP_NAMES.map((name, i) => {
                        const on = issue.step === i + 1;
                        return (
                          <Pressable
                            key={name}
                            onPress={() => setIssues((all) => all.map((x) => (x.key === issue.key ? { ...x, step: i + 1 } : x)))}
                            style={[styles.step, on && styles.stepOn]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                          >
                            <Text style={[styles.stepText, on && { color: colors.textOnDark }]}>
                              {i + 1}. {name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.issueRow}>
                      <TextInput
                        value={issue.message}
                        onChangeText={(v) => setIssues((all) => all.map((x) => (x.key === issue.key ? { ...x, message: v } : x)))}
                        placeholder="What should the creator change?"
                        placeholderTextColor={colors.textSubtle}
                        multiline
                        maxLength={300}
                        style={styles.issueInput}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove"
                        hitSlop={8}
                        onPress={() => setIssues((all) => all.filter((x) => x.key !== issue.key))}
                        style={styles.remove}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIssues((all) => [...all, { key: nextKey++, step: 2, message: "" }])}
                  style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text variant="title" color={colors.primary} style={{ fontSize: 14 }}>
                    Add something to fix
                  </Text>
                </Pressable>
              </View>
            )}

            {error && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text variant="bodySm" color={colors.danger} style={{ flex: 1 }}>
                  {error}
                </Text>
              </Animated.View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label={isChanges ? "Send to creator" : "Reject"}
              variant={isChanges ? "primary" : "danger"}
              icon={isChanges ? "paper-plane" : "close-circle"}
              loading={busy}
              onPress={submit}
              style={{ flex: 1.6 }}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    backdrop: { backgroundColor: colors.overlay },
    bottom: { flex: 1, justifyContent: "flex-end" },
    sheet: {
      maxHeight: "88%",
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl + 6,
      borderTopRightRadius: radius.xl + 6,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      gap: spacing.lg,
    },
    grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
    head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    headIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    issue: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
    steps: { gap: 6 },
    step: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    stepText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
    issueRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    issueInput: {
      flex: 1,
      minHeight: 44,
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      textAlignVertical: "top",
    },
    remove: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerSoft },
    add: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
    error: { flexDirection: "row", gap: 6, alignItems: "center" },
    actions: { flexDirection: "row", gap: spacing.sm },
  }),
);
