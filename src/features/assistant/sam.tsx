// Sam, the voice assistant: a floating avatar on the left of every user screen.
//   tap        → listen (say "Hey Sam, ..."); the rest of the screen blurs while you talk
//   double-tap → a text bar to type instead
//   drag       → move him; drop him on the cross to switch him off (back on in Settings)
// The thinking is done on the server (OpenAI); Sam speaks the reply and the app acts on it.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  PanResponder,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { assistantApi, type SamContext, type SamReply } from "@/api/assistant";
import { authApi } from "@/api/auth";
import { ApiError } from "@/api/client";
import type { Me } from "@/api/types";
import { Text, useToast } from "@/components/ui";
import { activeBlurTarget } from "@/components/ui/tab-bar";
import { meQueryKey, useAuth } from "@/features/auth/auth-provider";
import {
  colors,
  dk,
  fonts,
  isDark,
  radius,
  shadow,
  spacing,
  themed,
} from "@/theme";
import {
  clearHello,
  currentEditor,
  endSamSession,
  isHelloPending,
  onImageReady,
  onSamSessionEnd,
  setIntake,
  setSamTalking,
  samSessionId,
  startSamSession,
  takeGuide,
} from "./bridge";
import { runActions } from "./run-actions";
import { useTheme } from "@/theme/theme-provider";
import { SamWelcome } from "./welcome";
import { useVoice } from "./use-voice";

export const SAM_IMAGE = require("../../../assets/images/sam.png");
export const SAM_SIZE = 64;
const DOUBLE_TAP_MS = 280;
const STEP_NAMES = ["About", "Story", "Visuals", "Reach", "Submit"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TAB_ROUTES = ["/", "/explore", "/create", "/activity", "/profile"];
// Screens where Sam stays out of the way (they record audio themselves)
const HIDDEN_ON = ["/create/voice"];

type Phase = "idle" | "listening" | "thinking" | "speaking";

/** Mounted once at the root: shows Sam for signed-in users (not the admin) who have him switched on. */
export function SamLayer() {
  const { isSignedIn, isAdmin, user } = useAuth();
  if (!isSignedIn || isAdmin || !user || !user.assistantEnabled) return null;
  return <Sam introduced={user.appIntroduced} />;
}

function Sam({ introduced }: { introduced: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const voice = useVoice();
  const { setMode } = useTheme();
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [overCancel, setOverCancel] = useState(false);
  const history = useRef<SamContext["history"]>([]);
  const busy = useRef(false);

  // Sam says hello on Home after every sign-in, and whenever the account hasn't seen it
  // (also after "Show Sam's hello again" in Settings, which shows it right there)
  const [helloPending, setHelloPending] = useState(isHelloPending);
  const welcoming = !introduced || (helloPending && pathname === "/");
  const finishWelcome = () => {
    voice.stopSpeaking();
    clearHello();
    setHelloPending(false);
    if (introduced) return;
    qc.setQueryData<Me>(meQueryKey, (me) =>
      me ? { ...me, appIntroduced: true } : me,
    );
    void authApi.updateMe({ appIntroduced: true }).catch(() => {});
  };

  // Home position: bottom-left, just above the floating tab bar
  const home = { x: 12, y: Math.round(H - insets.bottom - 96 - SAM_SIZE - 16) };
  const pos = { x: useSharedValue(home.x), y: useSharedValue(home.y) };
  const at = useRef({ x: home.x, y: home.y });
  // Where Sam rests (rendering reads this; the drag maths uses `at`)
  const [dock, setDock] = useState(home);

  // Sam sits still when idle: an endless float would redraw over every screen, every frame
  const level = useSharedValue(0);
  useEffect(() => {
    level.set(withTiming(voice.level, { duration: 120 }));
  }, [voice.level, level]);
  const lift = useSharedValue(1);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pos.x.value },
      { translateY: pos.y.value },
      { scale: lift.value },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + level.value * 0.45 }],
    opacity: 0.25 + level.value * 0.5,
  }));

  const cancelCenter = { x: W / 2, y: H - insets.bottom - 120 };

  const turnOff = async () => {
    voice.stopSpeaking();
    voice.stopListening(false);
    qc.setQueryData<Me>(meQueryKey, (me) =>
      me ? { ...me, assistantEnabled: false } : me,
    );
    toast("Sam is off. Turn him back on in Settings.", "info");
    await authApi.updateMe({ assistantEnabled: false }).catch(() => {});
  };

  const context = (): SamContext => {
    const ed = currentEditor();
    return {
      screen: pathname,
      editor: ed
        ? {
            campaignId: ed.campaignId,
            step: ed.step,
            fields: ed.values(),
            missing: ed.missing(),
            stepMissing: ed.stepMissing(),
            creatingImage: ed.creatingImage(),
          }
        : null,
      // Enough turns to remember a whole Q&A (like the 3 draft questions); each line within the API limit
      history: history.current
        .slice(-10)
        .map((h) => ({ ...h, text: h.text.slice(0, 600) })),
    };
  };

  // Steps move only when the user agrees (Sam asks "looks good, shall we move on?"); nothing to do here
  const advanceIfDone = async (_actions: SamReply["actions"]) => {};

  const lastVia = useRef<"voice" | "text">("voice");
  const guide = useRef<(note: string) => void>(() => {});
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  });
  const listenAgain = useRef<() => void>(() => {});
  const respond = async (
    ask: () => Promise<SamReply>,
    via: "voice" | "text",
  ) => {
    lastVia.current = via;
    setPhase("thinking");
    let followUp = false;
    let nextStep = false;
    try {
      const r = await ask();
      followUp = r.expectsAnswer === true;
      nextStep = r.continueGuide === true;
      // Creating a campaign with Sam: his own screen, with nothing else to tap while he asks
      if (r.intake) {
        setIntake(r.intake);
        if (pathnameRef.current !== "/create/sam") router.navigate("/create/sam");
      }
      if (r.transcript)
        history.current.push({ role: "user", text: r.transcript });
      history.current.push({ role: "sam", text: r.reply });
      // A new draft starts a new conversation: earlier answers must not leak into the next campaign
      if (r.actions.some((a) => a.type === "draft_from_idea" || a.type === "new_draft")) {
        history.current = [{ role: "sam", text: r.reply }];
      }
      setHeard(r.transcript || null);
      setCaption(r.reply);
      setPhase("speaking");
      // Act while speaking, so the screen changes as Sam says it
      const acting = runActions(r.actions, {
        qc,
        turnOff: () => void turnOff(),
        setTheme: setMode,
      })
        .then(() => advanceIfDone(r.actions))
        .catch(() =>
        toast("I couldn't finish that. Please try again.", "error"),
      );
      await Promise.all([
        voice.play(r.audioUrl),
        acting,
        r.audioUrl ? null : new Promise((res) => setTimeout(res, 3500)),
      ]);
    } catch (err) {
      // Say what actually went wrong: a slow answer, a busy limit and a lost connection need different fixes
      const code = err instanceof ApiError ? err.code : "";
      setCaption(
        code === "TIMEOUT"
          ? "Sorry, that took me too long. Please ask me again."
          : code === "NETWORK_ERROR"
            ? "Sorry, I couldn't reach the server. Check your connection and try again."
            : err instanceof ApiError && err.status > 0 && err.status < 500
              ? err.message
              : "Sorry, something went wrong on my side. Please ask me again.",
      );
      setPhase("speaking");
      await new Promise((res) => setTimeout(res, 3000));
    } finally {
      setPhase("idle");
      setCaption(null);
      setHeard(null);
      busy.current = false;
    }
    // Sam asked a question: open the mic (or the text bar) again for the answer, no tap needed
    // Moved to the next step: Sam looks at it and says what it has (or what it still needs)
    if (nextStep) {
      guide.current(
        "(You are now on {STEP}. Talk only about {STEP}: say in one sentence what it already has and ask if it looks good to move on, or ask for what it still needs.)",
      );
      return;
    }
    if (followUp) {
      if (via === "voice") setTimeout(() => listenAgain.current(), 250);
      else setTyping(true);
    }
  };

  // A guide turn Sam starts himself (editor opened, image ready); always uses the latest screen state
  useEffect(() => {
    guide.current = (note) => {
      void (async () => {
        // Wait for Sam to be free (he may be listening or talking)
        for (let i = 0; i < 150 && busy.current; i++) await wait(200);
        if (busy.current || !currentEditor()) return;
        busy.current = true;
        await wait(300); // let the editor show the latest values first
        // Name the step on screen exactly ("step 2, Story"), so Sam talks about the right one
        const step = currentEditor()?.step ?? 1;
        const text = note.replaceAll("{STEP}", `step ${step}, ${STEP_NAMES[step - 1]}`);
        void respond(() => assistantApi.text(text, context()), lastVia.current);
      })();
    };
  });
  // "Exit" in Sam mode: Sam stops at once and forgets this campaign's conversation
  useEffect(() => {
    onSamSessionEnd(() => {
      voice.stopSpeaking();
      voice.stopListening(false);
      history.current = [];
      setTyping(false);
    });
    return () => onSamSessionEnd(null);
  }, [voice]);

  useEffect(() => {
    onImageReady((kind) =>
      guide.current(
        `(The ${kind} image you created is ready and added to my campaign. Tell me you made it and ask if it looks good to move on, or ask for what is still needed on this step.)`,
      ),
    );
    return () => onImageReady(null);
  }, []);

  const claimEditor = () => {
    const ed = currentEditor();
    if (ed && !samSessionId()) startSamSession(ed.campaignId);
  };

  const startListening = async () => {
    if (busy.current) return;
    claimEditor();
    busy.current = true;
    setHeard(null);
    setCaption(null);
    setPhase("listening");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const uri = await voice.listen();
    if (uri === "denied") {
      setPhase("idle");
      busy.current = false;
      toast(
        "Allow microphone access to talk to Sam, or double-tap him to type.",
        "error",
      );
      return;
    }
    if (!uri) {
      setPhase("idle");
      busy.current = false;
      return;
    }
    await respond(() => assistantApi.voice(uri, context()), "voice");
  };

  // Sam started a draft: once its editor is open, he carries on and guides through the steps
  useEffect(() => {
    const inEditor =
      /^\/create\/[^/]+$/.test(pathname) && !["/create/voice", "/create/new", "/create/sam"].includes(pathname);
    // Leaving the editor (submitted, or gone elsewhere) ends Sam mode
    if (!inEditor) {
      if (samSessionId() && pathname !== "/create/sam") endSamSession();
      return;
    }
    let stop = false;
    (async () => {
      for (let i = 0; i < 25 && !stop && !currentEditor(); i++) await new Promise((r) => setTimeout(r, 200));
      if (stop || !currentEditor() || !takeGuide()) return;
      startSamSession(currentEditor()!.campaignId); // the editor is Sam's until the last step
      await wait(700); // let the editor appear first
      if (stop) return;
      guide.current("(The campaign editor just opened with my draft. Guide me through what is still needed.)");
    })();
    return () => {
      stop = true;
    };
  }, [pathname]);

  useEffect(() => {
    listenAgain.current = () => void startListening();
  });

  // Fields in the editor lock only while Sam is busy with the user. Going quiet waits a moment, so the
  // short gap before he listens again (or starts the next step) doesn't unlock them for a blink
  const active = phase !== "idle" || typing;
  useEffect(() => {
    if (active) {
      setSamTalking(true);
      return;
    }
    const t = setTimeout(() => setSamTalking(false), 600);
    return () => clearTimeout(t);
  }, [active]);
  useEffect(() => () => setSamTalking(false), []);

  const onTap = () => {
    if (welcoming) finishWelcome(); // tapping Sam during his hello: straight on to talking
    if (typing) setTyping(false);
    else if (phase === "listening") voice.stopListening(true);
    else if (phase === "speaking") voice.stopSpeaking();
    else if (phase === "idle") void startListening();
  };

  // Typing replaces talking: an open mic is closed without sending; nothing opens while Sam is answering
  const openTyping = () => {
    if (welcoming) finishWelcome();
    if (phase === "thinking" || phase === "speaking") return;
    if (phase === "listening") voice.stopListening(false);
    setTyping(true);
  };

  const sendText = (text: string) => {
    if (!text.trim() || busy.current) return;
    claimEditor();
    busy.current = true;
    Keyboard.dismiss();
    setTyping(false);
    void respond(() => assistantApi.text(text.trim(), context()), "text");
  };

  // ── Touch: tap, double-tap, drag ──
  const gesture = useRef({
    single: null as ReturnType<typeof setTimeout> | null,
    dragging: false,
    over: false,
  });
  const handlers = useRef({ onTap, openTyping, turnOff });
  useEffect(() => {
    handlers.current = { onTap, openTyping, turnOff };
  });

  // The handlers below run on touches, never during render
  /* eslint-disable react-hooks/refs */
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gesture.current.dragging = false;
        },
        onPanResponderMove: (_, d) => {
          const g = gesture.current;
          // Any real movement picks Sam up straight away (no long press)
          if (!g.dragging) {
            if (Math.hypot(d.dx, d.dy) < 8) return;
            g.dragging = true;
            if (g.single) clearTimeout(g.single);
            g.single = null;
            setDragging(true);
            lift.set(withSpring(1.12));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {},
            );
          }
          const x = at.current.x + d.dx;
          const y = at.current.y + d.dy;
          pos.x.set(x);
          pos.y.set(y);
          const over =
            Math.hypot(
              x + SAM_SIZE / 2 - cancelCenter.x,
              y + SAM_SIZE / 2 - cancelCenter.y,
            ) < 70;
          if (over !== g.over) {
            g.over = over;
            setOverCancel(over);
            if (over) Haptics.selectionAsync().catch(() => {});
          }
        },
        onPanResponderRelease: (_, d) => {
          const g = gesture.current;
          if (g.dragging) {
            g.dragging = false;
            g.over = false;
            setDragging(false);
            setOverCancel(false);
            lift.set(withSpring(1));
            const x = at.current.x + d.dx;
            const y = at.current.y + d.dy;
            if (
              Math.hypot(
                x + SAM_SIZE / 2 - cancelCenter.x,
                y + SAM_SIZE / 2 - cancelCenter.y,
              ) < 70
            ) {
              void handlers.current.turnOff();
              return;
            }
            // Settle against the nearest side edge, within the safe area
            const nx = x + SAM_SIZE / 2 < W / 2 ? 12 : W - SAM_SIZE - 12;
            const ny = Math.min(
              Math.max(y, insets.top + 60),
              H - insets.bottom - 160,
            );
            at.current = { x: nx, y: ny };
            setDock({ x: nx, y: ny });
            pos.x.set(withSpring(nx, { damping: 16 }));
            pos.y.set(withSpring(ny, { damping: 16 }));
            return;
          }
          // A second tap while the first is still waiting = double tap; otherwise wait to see
          if (g.single) {
            clearTimeout(g.single);
            g.single = null;
            handlers.current.openTyping();
          } else {
            g.single = setTimeout(() => {
              g.single = null;
              handlers.current.onTap();
            }, DOUBLE_TAP_MS);
          }
        },
        onPanResponderTerminate: () => {
          const g = gesture.current;
          if (g.dragging) {
            g.dragging = false;
            g.over = false;
            setDragging(false);
            setOverCancel(false);
            lift.set(withSpring(1));
            pos.x.set(withSpring(at.current.x));
            pos.y.set(withSpring(at.current.y));
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [W, H],
  );
  /* eslint-enable react-hooks/refs */

  if (HIDDEN_ON.includes(pathname) && phase === "idle" && !welcoming)
    return null;

  const focused = phase === "listening" || phase === "thinking";
  const onTab = TAB_ROUTES.includes(pathname);
  const blurTarget = onTab ? activeBlurTarget() : undefined;
  const bubbleOnLeft = dock.x < W / 2;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* While the user talks (and Sam thinks), the rest of the screen blurs */}
      {focused && (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(220)}
          style={StyleSheet.absoluteFill}
        >
          <BlurView
            blurTarget={blurTarget}
            blurMethod={blurTarget ? "dimezisBlurViewSdk31Plus" : "none"}
            intensity={70}
            tint={isDark() ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, styles.scrim]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => voice.stopListening(false)}
            accessibilityLabel="Stop listening"
          />
          <Animated.View
            entering={FadeInDown.duration(260)}
            style={[styles.listenCard, { top: insets.top + 80 }]}
            pointerEvents="none"
          >
            <Text style={styles.listenTitle}>
              {phase === "listening" ? "I'm listening…" : "Thinking…"}
            </Text>
            <Text variant="bodySm" align="center">
              {phase === "listening"
                ? "Try “Hey Sam, show me health campaigns” or “take me to my payments”. Tap me when you're done."
                : (heard ?? "One moment.")}
            </Text>
            {phase === "thinking" && (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </Animated.View>
        </Animated.View>
      )}

      {/* Drop zone for switching Sam off */}
      {dragging && (
        <Animated.View
          entering={ZoomIn.duration(180)}
          exiting={ZoomOut.duration(150)}
          pointerEvents="none"
          style={[
            styles.cancel,
            { left: cancelCenter.x - 34, top: cancelCenter.y - 34 },
            overCancel && styles.cancelOn,
          ]}
        >
          <Ionicons
            name="close"
            size={32}
            color={overCancel ? "#FFFFFF" : colors.danger}
          />
        </Animated.View>
      )}
      {dragging && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          pointerEvents="none"
          style={[styles.cancelHint, { top: cancelCenter.y + 44 }]}
        >
          <Text variant="caption" color={colors.text} align="center">
            Drop here to turn Sam off
          </Text>
        </Animated.View>
      )}

      {/* What Sam is saying */}
      {phase === "speaking" && caption && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(160)}
          pointerEvents="none"
          style={[
            styles.caption,
            { top: Math.max(insets.top + 12, dock.y - 96) },
            bubbleOnLeft
              ? { left: 12 + SAM_SIZE + 8, right: 24 }
              : { right: 12 + SAM_SIZE + 8, left: 24 },
          ]}
        >
          <Text variant="bodySm" color={colors.text}>
            {caption}
          </Text>
        </Animated.View>
      )}

      {/* First time (or replayed from Settings): Sam says hello. It sits under Sam, so he stays tappable */}
      {welcoming && (
        <SamWelcome
          bottom={H - dock.y + 12}
          play={voice.play}
          stop={voice.stopSpeaking}
          onDone={finishWelcome}
        />
      )}

      {/* Sam */}
      <Animated.View
        style={[styles.bubble, bubbleStyle]}
        {...responder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel="Sam, voice assistant. Tap to talk, double-tap to type, drag to move."
      >
        {phase === "listening" && (
          <Animated.View style={[styles.ring, ringStyle]} />
        )}
        {phase === "thinking" && <ThinkingRing />}
        <Image source={SAM_IMAGE} style={styles.avatar} contentFit="contain" />
        {phase === "listening" && (
          <View style={styles.mic}>
            <Ionicons name="mic" size={13} color="#FFFFFF" />
          </View>
        )}
        {phase === "speaking" && (
          <View style={styles.mic}>
            <Ionicons name="volume-high" size={12} color="#FFFFFF" />
          </View>
        )}
      </Animated.View>

      {typing && <TypeBar onSend={sendText} onClose={() => setTyping(false)} />}
    </View>
  );
}

function ThinkingRing() {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(
      withRepeat(
        withTiming(1, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [spin]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  return <Animated.View style={[styles.thinking, style]} />;
}

/** Double-tap: type to Sam instead of talking. */
function TypeBar({
  onSend,
  onClose,
}: {
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  // Rides on top of the keyboard, frame by frame (the keyboard's real height from the OS)
  const keyboard = useAnimatedKeyboard();
  const minBottom = insets.bottom + 10;
  const lift = useAnimatedStyle(() => ({
    bottom: Math.max(minBottom, keyboard.height.value + 10),
  }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={[StyleSheet.absoluteFill, styles.typeScrim]}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        style={[
          styles.typeBar,
          { position: "absolute", left: 0, right: 0 },
          lift,
        ]}
      >
        <Image
          source={SAM_IMAGE}
          style={styles.typeAvatar}
          contentFit="contain"
        />
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          placeholder="Ask Sam anything…"
          placeholderTextColor={colors.textSubtle}
          returnKeyType="send"
          onSubmitEditing={() => onSend(text)}
          style={styles.typeInput}
          maxLength={500}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!text.trim()}
          onPress={() => onSend(text)}
          style={[styles.send, !text.trim() && { opacity: 0.4 }]}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    scrim: {
      backgroundColor: dk("rgba(247,246,255,0.55)", "rgba(15,16,32,0.55)"),
    },
    bubble: {
      position: "absolute",
      left: 0,
      top: 0,
      width: SAM_SIZE,
      height: SAM_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    avatar: { width: SAM_SIZE, height: SAM_SIZE, borderRadius: SAM_SIZE / 2 },
    ring: {
      position: "absolute",
      width: SAM_SIZE + 22,
      height: SAM_SIZE + 22,
      borderRadius: (SAM_SIZE + 22) / 2,
      backgroundColor: colors.primary,
    },
    thinking: {
      position: "absolute",
      width: SAM_SIZE + 12,
      height: SAM_SIZE + 12,
      borderRadius: (SAM_SIZE + 12) / 2,
      borderWidth: 3,
      borderColor: colors.primarySoft,
      borderTopColor: colors.primary,
    },
    mic: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    listenCard: {
      position: "absolute",
      left: spacing.xl,
      right: spacing.xl,
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.xl,
      borderRadius: radius.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      ...shadow.card,
    },
    listenTitle: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.primary,
    },
    cancel: {
      position: "absolute",
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.danger,
      ...shadow.card,
    },
    cancelOn: { backgroundColor: colors.danger, transform: [{ scale: 1.15 }] },
    cancelHint: { position: "absolute", left: 0, right: 0 },
    caption: {
      position: "absolute",
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.primary,
      ...shadow.card,
    },
    typeScrim: {
      backgroundColor: dk("rgba(38,38,74,0.18)", "rgba(0,0,0,0.35)"),
    },
    typeBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      padding: 6,
      paddingLeft: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.primaryMuted,
      ...shadow.card,
    },
    typeAvatar: { width: 40, height: 40, borderRadius: 20 },
    typeInput: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 10,
    },
    send: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  }),
);
