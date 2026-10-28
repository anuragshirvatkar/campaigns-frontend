import { useSyncExternalStore } from "react";

// What Sam can reach outside his own component: the campaign editor (to read and fill it).
// The editor registers itself; Sam looks it up.

// ─── Campaign editor ──────────────────────────────────────────────────────────

export type EditorBridge = {
  campaignId: string;
  step: number;
  /** Current values Sam may read (plain text / numbers) */
  values: () => Record<string, string | number | boolean | null>;
  /** What's still needed before this campaign can be submitted */
  missing: () => string[];
  /** What blocks the step on screen */
  stepMissing: () => string[];
  /** What blocks a given step */
  stepMissingAt: (step: number) => string[];
  fill: (field: string, value: string) => boolean;
  goToStep: (step: number) => void;
  /** Creates an AI image (~30 s) and puts it in the cover or the ad images */
  generateImage: (kind: "cover" | "ad", prompt: string) => void;
  creatingImage: () => "cover" | "ad" | null;
};

let editor: EditorBridge | null = null;

/** The editor registers itself while open; returns the cleanup. */
export function registerEditor(bridge: EditorBridge) {
  editor = bridge;
  return () => {
    if (editor === bridge) editor = null;
  };
}

export const currentEditor = () => editor;

// The editor tells Sam when an image he started is ready, so he can say so and carry on
let imageReady: ((kind: "cover" | "ad") => void) | null = null;
export const onImageReady = (fn: ((kind: "cover" | "ad") => void) | null) => {
  imageReady = fn;
};
export const announceImageReady = (kind: "cover" | "ad") => imageReady?.(kind);

// ─── Hello after sign-in ──────────────────────────────────────────────────────

// Set on every sign-in; Sam says hello once the user is on Home, then it's cleared
let helloPending = false;
export const queueHello = () => {
  helloPending = true;
};
export const isHelloPending = () => helloPending;
export const clearHello = () => {
  helloPending = false;
};

// ─── Guide after a draft opens ────────────────────────────────────────────────

// Set when Sam starts a draft; once the editor is open he picks up and starts guiding
let guidePending = false;
export const queueGuide = () => {
  guidePending = true;
};
export const takeGuide = () => {
  const g = guidePending;
  guidePending = false;
  return g;
};

// ─── Creating with Sam ────────────────────────────────────────────────────────

// While Sam builds a campaign, its editor is in "Sam mode": one thing at a time, the form is his.
let session: string | null = null;
const sessionListeners = new Set<() => void>();
let sessionEnded: (() => void) | null = null;
const emit = () => sessionListeners.forEach((l) => l());
export const startSamSession = (campaignId: string) => {
  session = campaignId;
  emit();
};
/** Ends Sam mode; Sam stops talking and listening. */
export const endSamSession = () => {
  if (session === null) return;
  session = null;
  talking = false;
  emit();
  sessionEnded?.();
};
export const samSessionId = () => session;

// Sam is busy with the user (listening, thinking, talking, or the type bar is open): the editor's fields
// are his while that lasts; once he's quiet the user can edit them freely
let talking = false;
export const setSamTalking = (on: boolean) => {
  if (talking === on) return;
  talking = on;
  emit();
};
export function useSamTalking() {
  return useSyncExternalStore(
    (l) => {
      sessionListeners.add(l);
      return () => sessionListeners.delete(l);
    },
    () => talking,
  );
}
export const onSamSessionEnd = (fn: (() => void) | null) => {
  sessionEnded = fn;
};
export function useSamSession(campaignId: string) {
  return useSyncExternalStore(
    (l) => {
      sessionListeners.add(l);
      return () => sessionListeners.delete(l);
    },
    () => session === campaignId,
  );
}

// ─── "Create with Sam": collecting the three answers ─────────────────────────

export type Intake = { about: string; audience: string; why: string };
type IntakeState = { idea: Intake | null; draft: string | null };
let intake: IntakeState = { idea: null, draft: null };
const intakeListeners = new Set<() => void>();
const setIntakeState = (next: IntakeState) => {
  intake = next;
  intakeListeners.forEach((l) => l());
};
/** Sam is collecting answers: the screen shows what's known so far. */
export const setIntake = (idea: Intake) => setIntakeState({ idea, draft: null });
/** All three answers are in: the screen writes the draft from this text. */
export const startIntakeDraft = (text: string) => setIntakeState({ idea: intake.idea, draft: text });
export const clearIntake = () => setIntakeState({ idea: null, draft: null });
export const intakeActive = () => intake.idea !== null;
export function useIntake() {
  return useSyncExternalStore(
    (l) => {
      intakeListeners.add(l);
      return () => intakeListeners.delete(l);
    },
    () => intake,
  );
}
/** Stops Sam right away (Exit on a Sam screen). */
export const stopSamNow = () => sessionEnded?.();
