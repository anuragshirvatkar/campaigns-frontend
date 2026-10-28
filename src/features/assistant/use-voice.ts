// Sam's ears and mouth: records until the user goes quiet, and plays his replies.
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/config/env";

// Mono speech at 64 kbps keeps uploads small; metering lets us hear when the user stops talking
const SPEECH = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
  sampleRate: 22_050,
  isMeteringEnabled: true,
  android: { ...RecordingPresets.HIGH_QUALITY.android, sampleRate: 22_050 },
};

const SPEAKING_DB = -38; // louder than this counts as speech
const SILENCE_MS = 1400; // quiet for this long after speaking → done
const NO_SPEECH_MS = 7000; // never spoke → give up
const MAX_MS = 15_000; // listening always ends after 15 s (what was said is sent)

export type Listening = { level: number };

export function useVoice() {
  const recorder = useAudioRecorder(SPEECH);
  const [level, setLevel] = useState(0); // 0..1, for the listening animation
  const finish = useRef<((uri: string | null) => void) | null>(null);
  const recording = useRef(false);
  const player = useRef<AudioPlayer | null>(null);
  const playing = useRef<(() => void) | null>(null);

  // Sam leaving the screen (turned off, signed out, reload) while listening: stop the listening timer at
  // once, since the microphone is released with him
  const unmounted = useRef(false);
  useEffect(
    () => () => {
      unmounted.current = true;
      finish.current?.(null);
      player.current?.remove();
    },
    [],
  );

  /** Starts recording; resolves with the file once the user stops talking (or null if nothing was said). */
  const listen = useCallback(async (): Promise<string | null | "denied"> => {
    // One recording at a time: starting the recorder twice crashes it natively
    if (recording.current) return null;
    recording.current = true;
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      recording.current = false;
      return "denied";
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      recording.current = false;
      return null;
    }

    return new Promise((resolve) => {
      const started = Date.now();
      let spokeAt = 0;
      let quietSince = 0;
      let stopped = false;
      const stop = async (keep: boolean) => {
        if (stopped) return;
        stopped = true;
        clearInterval(timer);
        finish.current = null;
        if (unmounted.current) {
          // The recorder is already gone; nothing to stop or send
          recording.current = false;
          resolve(null);
          return;
        }
        setLevel(0);
        try {
          await recorder.stop();
        } catch {}
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        recording.current = false;
        resolve(keep ? recorder.uri : null);
      };
      finish.current = (uri) => void stop(uri !== null);
      const timer = setInterval(() => {
        let db = -160;
        try {
          db = recorder.getStatus().metering ?? -160;
        } catch {
          // Recorder released underneath us: end quietly instead of throwing every 120 ms
          void stop(false);
          return;
        }
        setLevel(Math.max(0, Math.min(1, (db + 60) / 50)));
        const now = Date.now();
        if (db > SPEAKING_DB) {
          spokeAt = now;
          quietSince = 0;
        } else if (spokeAt && !quietSince) quietSince = now;
        if (spokeAt && quietSince && now - quietSince > SILENCE_MS) void stop(true);
        else if (!spokeAt && now - started > NO_SPEECH_MS) void stop(false);
        else if (now - started > MAX_MS) void stop(true);
      }, 120);
    });
  }, [recorder]);

  /** Ends listening now and sends what was said (tap while listening). */
  const stopListening = useCallback((send: boolean) => finish.current?.(send ? "" : null), []);

  /** Plays one of Sam's clips (a path from the API); resolves when it ends or is stopped. */
  /** `clip`: a path from the API, or a bundled audio file (require). */
  const play = useCallback(async (clip: string | number | null) => {
    if (clip === null || clip === "") return;
    playing.current?.();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    player.current?.remove();
    const p = createAudioPlayer(typeof clip === "number" ? clip : { uri: env.apiUrl + clip });
    player.current = p;
    await new Promise<void>((resolve) => {
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        sub.remove();
        clearTimeout(guard);
        playing.current = null;
        resolve();
      };
      const sub = p.addListener("playbackStatusUpdate", (s) => {
        if (s.didJustFinish) end();
      });
      // Never hang if the clip fails to load
      const guard = setTimeout(end, 30_000);
      playing.current = () => {
        p.pause();
        end();
      };
      p.play();
    });
  }, []);

  const stopSpeaking = useCallback(() => playing.current?.(), []);

  return { listen, stopListening, play, stopSpeaking, level };
}
