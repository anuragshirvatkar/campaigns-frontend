// "Create with your voice": answer guided questions out loud, get a transcript you can edit,
// then AI turns it into a draft. Typing works too, so a missing mic or AI never blocks anyone.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { campaignsApi } from "@/api/campaigns";
import { ApiError } from "@/api/client";
import { platformApi } from "@/api/platform";
import { useConfig } from "@/api/queries";
import { Button, Note, Screen, Skeleton, Text, TextField, useToast } from "@/components/ui";
import { aiDraftToForm } from "@/features/create/ai-assist";
import { aiNotes } from "@/features/create/ai-notes";
import { formFromCampaign } from "@/features/create/use-draft";
import { colors, fonts, shadow, spacing, themed } from "@/theme";

// Speech needs far less than music: mono at 64 kbps keeps uploads small on mobile data
const SPEECH = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
  sampleRate: 22_050,
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 22_050 },
};

export default function VoiceScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const config = useConfig();
  const recorder = useAudioRecorder(SPEECH);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  // Recording timer + two rings breathing out from the mic
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!recording) {
      pulse.set(0);
      return;
    }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
    return () => clearInterval(t);
  }, [recording, pulse]);
  const ring1 = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.7 }] }));
  const ring2 = useAnimatedStyle(() => {
    const p = (pulse.value + 0.5) % 1;
    return { opacity: 0.45 * (1 - p), transform: [{ scale: 1 + p * 0.7 }] };
  });

  const transcribe = useMutation({
    mutationFn: (uri: string) => platformApi.transcribe({ uri, name: "recording.m4a", type: "audio/mp4" }),
    onSuccess: (r) => {
      // AI screens the recording first: noise or off-topic talk isn't added
      if (r.meaningful === false) {
        setRejected(r.reason || "That didn't sound like a campaign idea. Try describing your message again.");
        return;
      }
      setRejected(null);
      setTranscript((t) => (t.trim() ? `${t.trim()}\n${r.text}` : r.text));
      if (r.mode === "demo") setDemoMode(true);
      else toast("Got it. Your words are below.");
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't transcribe. You can type instead.", "error"),
  });

  const startRecording = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setMicDenied(true);
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setSeconds(0);
    setRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const stopRecording = async () => {
    await recorder.stop();
    setRecording(false);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (recorder.uri) transcribe.mutate(recorder.uri);
    else toast("Nothing was recorded. Check microphone access, or type instead.", "error");
  };

  // Create the draft, let AI fill it, and land on the editable first step
  const build = useMutation({
    mutationFn: async () => {
      const campaign = await campaignsApi.create("voice");
      const { mode, draft } = await platformApi.draft(transcript.trim());
      const v = aiDraftToForm(draft, formFromCampaign(campaign));
      const text = (s: string | undefined) => (s?.trim() ? s : null);
      const updated = await campaignsApi.update(campaign.id, {
        title: text(v.title),
        category: v.category ?? null,
        creatorType: v.creatorType ?? null,
        creatorDescription: text(v.creatorDescription),
        summary: text(v.summary),
        targetAudience: text(v.targetAudience),
        whyItMatters: text(v.whyItMatters),
        storyHeadline: text(v.storyHeadline),
        storyIntro: text(v.storyIntro),
        storyBlocks: v.storyBlocks ?? [],
        adHeadline: text(v.adHeadline),
        adDescription: text(v.adDescription),
        ctaText: text(v.ctaText),
      });
      const notes = [...draft.followUpQuestions];
      if (mode === "demo") notes.unshift("AI was unavailable, so this is a demo draft. Replace it with your own details.");
      aiNotes.set(updated.id, notes);
      return updated;
    },
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ["my-campaigns"] });
      router.replace({ pathname: "/create/[id]", params: { id: c.id } });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't create the draft. Try again.", "error"),
  });

  const prompts = config.data?.voicePrompts ?? [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Screen>
        <Text variant="h2">Tell us your idea</Text>
        <Text variant="bodySm" style={{ marginTop: 4 }}>
          {"Talk through these, in your own words. You'll edit everything after."}
        </Text>

        <View style={styles.prompts}>
          {config.isPending &&
            [0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.prompt}>
                <Skeleton width={16} height={16} />
                <Skeleton width={`${70 - i * 8}%`} height={16} />
              </View>
            ))}
          {prompts.map((p, i) => (
            <View key={p} style={styles.prompt}>
              <Text style={styles.num}>{i + 1}</Text>
              <Text variant="body" style={{ flex: 1 }}>
                {p}
              </Text>
            </View>
          ))}
        </View>

        {/* Mic */}
        <View style={styles.micArea}>
          <View style={styles.micStage}>
            {recording && <Animated.View style={[styles.ring, ring1]} />}
            {recording && <Animated.View style={[styles.ring, ring2]} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recording ? "Stop recording" : "Start recording"}
              disabled={transcribe.isPending}
              onPress={recording ? stopRecording : startRecording}
              style={({ pressed }) => [styles.mic, recording && styles.micOn, pressed && { transform: [{ scale: 0.95 }] }]}
            >
              <Ionicons name={recording ? "stop" : "mic"} size={38} color={colors.textOnDark} />
            </Pressable>
          </View>
          <Text variant="title" color={recording ? colors.coral : colors.textMuted}>
            {transcribe.isPending
              ? "Checking what you said…"
              : recording
                ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} · tap to stop`
                : transcript
                  ? "Tap to add more"
                  : "Tap to talk"}
          </Text>
        </View>

        {rejected && <Note tone="warning">{rejected}</Note>}
        {micDenied && <Note tone="warning">Microphone is off. Type below, or allow it in Settings.</Note>}
        {demoMode && <Note tone="warning">Speech-to-text is in demo mode, so a sample was used. Edit it or type your own.</Note>}

        <TextField
          label="Your words"
          multiline
          minLines={5}
          value={transcript}
          onChangeText={setTranscript}
          maxLength={8000}
          placeholder="What you say appears here. You can also type."
        />

        <Button
          label={build.isPending ? "Writing your draft…" : "Create my draft"}
          icon="sparkles"
          block
          loading={build.isPending}
          disabled={transcript.trim().length < 20 || recording}
          onPress={() => build.mutate()}
          style={{ marginTop: spacing.lg }}
        />
        <Text variant="caption" align="center" style={{ marginTop: spacing.sm }}>
          AI never adds sources or sets your funding goal.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const MIC = 104;

const styles = themed(() => StyleSheet.create({
  prompts: { gap: spacing.md, marginTop: spacing.xl },
  prompt: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  num: { width: 24, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 23, color: colors.primary },
  micArea: { alignItems: "center", paddingVertical: spacing.xl },
  micStage: { width: MIC * 1.8, height: MIC * 1.5, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: MIC, height: MIC, borderRadius: MIC / 2, backgroundColor: colors.coral },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  micOn: { backgroundColor: colors.coral },
}));
