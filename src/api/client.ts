import { env } from "@/config/env";
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown; // plain object → JSON; FormData → multipart upload
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Uploads and AI calls need longer than the default */
  timeoutMs?: number;
  headers?: Record<string, string>;
};

// The auth provider registers these so the client stays free of React
let currentToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const TIMEOUT_MS = 20_000;

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // Built by hand: React Native's URL class doesn't fully implement searchParams
  const query = Object.entries(options.query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  const url = env.apiUrl + path + (query ? `?${query}` : "");

  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;
  Object.assign(headers, options.headers);

  // One controller for both the caller's cancel and our timeout (AbortSignal.any/timeout
  // aren't reliably available in React Native)
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? TIMEOUT_MS);
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel);

  let res: { status: number; ok: boolean; json: () => Promise<unknown> };
  try {
    res = isForm
      ? await sendForm(url, options.method ?? "POST", headers, options.body as FormData, controller.signal)
      : await fetch(url, {
          method: options.method ?? "GET",
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });
  } catch (err) {
    if (options.signal?.aborted) throw err;
    if (timedOut) throw new ApiError(0, "TIMEOUT", "This is taking longer than usual. Please try again.");
    // In development, show what actually failed so it can be diagnosed on a real phone
    const detail = __DEV__ && err instanceof Error ? ` (${err.message})` : "";
    console.warn(`Request failed: ${options.method ?? "GET"} ${path}`, err);
    throw new ApiError(0, "NETWORK_ERROR", `Couldn't reach the server. Check your connection and try again.${detail}`);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = data as Partial<ApiErrorBody> | null;
    if (res.status === 401 && currentToken) onUnauthorized?.();
    throw new ApiError(
      res.status,
      body?.error?.code ?? "HTTP_ERROR",
      body?.error?.message ?? "Something went wrong. Please try again.",
      body?.error?.details,
    );
  }
  return data as T;
}

/**
 * File uploads go through XMLHttpRequest. Expo replaces the global fetch with expo/fetch, which
 * rejects React Native's { uri, name, type } file parts; XMLHttpRequest still streams them from disk.
 */
function sendForm(url: string, method: string, headers: Record<string, string>, body: FormData, signal: AbortSignal) {
  return new Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.onload = () =>
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        json: async () => (xhr.responseText ? JSON.parse(xhr.responseText) : null),
      });
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(body);
  });
}
