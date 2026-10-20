// Config, uploads and AI helpers.
import { api } from "./client";
import type { AiDraft, PlatformConfig, Upload } from "./types";

export type UploadPurpose = "cover" | "ad" | "story" | "avatar";

export type LocalFile = { uri: string; name: string; type: string };

function formWith(file: LocalFile, fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // React Native's FormData takes { uri, name, type } for files
  form.append("file", file as unknown as Blob);
  return form;
}

export const platformApi = {
  config: () => api<PlatformConfig>("/config"),

  upload: (file: LocalFile, purpose: UploadPurpose) =>
    api<Upload>("/uploads", { method: "POST", body: formWith(file, { purpose }), timeoutMs: 120_000 }),

  transcribe: (file: LocalFile) =>
    api<{ mode: "ai" | "demo"; text: string; meaningful?: boolean; reason?: string }>("/ai/transcribe", {
      method: "POST",
      body: formWith(file),
      timeoutMs: 90_000,
    }),
  /** AI image for a cover (landscape) or ad (square). Takes ~30 seconds. */
  generateImage: (prompt: string, kind: "cover" | "ad") =>
    api<Upload>("/ai/image", { method: "POST", body: { prompt, kind }, timeoutMs: 150_000 }),
  draft: (text: string) =>
    api<{ mode: "ai" | "demo"; draft: AiDraft }>("/ai/draft", { method: "POST", body: { text }, timeoutMs: 90_000 }),
  creativeFeedback: (body: {
    imageUrl: string;
    title?: string;
    adHeadline?: string;
    adDescription?: string;
    ctaText?: string;
  }) =>
    api<{ mode: "ai" | "demo"; strengths: string[]; suggestions: string[] }>("/ai/creative-feedback", {
      method: "POST",
      body,
      timeoutMs: 90_000,
    }),
};
