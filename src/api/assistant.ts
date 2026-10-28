import { api } from "./client";

export type SamAction = {
  type: "navigate" | "open_campaign" | "back_campaign" | "search" | "show_category" | "new_draft" | "draft_from_idea" | "fill_field" | "go_step" | "generate_image" | "turn_off" | "set_theme" | "follow_campaign" | "unfollow_campaign" | "set_notification";
  target: string | null;
  field: string | null;
  value: string | null;
};

export type SamContext = {
  screen: string;
  editor?: {
    campaignId: string;
    step: number;
    fields: Record<string, string | number | boolean | null>;
    missing: string[];
    stepMissing: string[];
    creatingImage: "cover" | "ad" | null;
  } | null;
  history: { role: "user" | "sam"; text: string }[];
};

export type SamReply = {
  transcript: string;
  reply: string;
  actions: SamAction[];
  audioUrl: string | null;
  /** Sam asked a question and is waiting for the answer */
  expectsAnswer?: boolean;
  /** Sam just moved the editor to the next step: ask him about it once it's on screen */
  continueGuide?: boolean;
  /** Sam asked "shall we move on?": the user can check and edit the step until they answer */
  reviewStep?: boolean;
  /** While Sam collects the three answers for a new campaign: what he has so far */
  intake?: { about: string; audience: string; why: string } | null;
};

export const assistantApi = {
  /** A spoken request: the recording plus where the user is. */
  voice: (uri: string, context: SamContext) => {
    const form = new FormData();
    form.append("file", { uri, name: "speech.m4a", type: "audio/mp4" } as unknown as Blob);
    form.append("context", JSON.stringify(context));
    return api<SamReply>("/assistant/turn", { method: "POST", body: form, timeoutMs: 45_000 });
  },
  text: (text: string, context: SamContext) =>
    api<SamReply>("/assistant/turn", { method: "POST", body: { text, context }, timeoutMs: 40_000 }),
  speak: (text: string) => api<{ audioUrl: string | null }>("/assistant/speak", { method: "POST", body: { text }, timeoutMs: 30_000 }),
};
