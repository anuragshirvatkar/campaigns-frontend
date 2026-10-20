// Receipt keys for payments made without an account. The server only shows a guest payment to
// whoever holds its key, so they live in the device keystore and survive app restarts.
import * as SecureStore from "expo-secure-store";

const KEY = "guest_receipts";

let cache: Record<string, string> | null = null;

function all(): Record<string, string> {
  if (!cache) {
    try {
      cache = JSON.parse(SecureStore.getItem(KEY) ?? "{}") as Record<string, string>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

export const guestReceipts = {
  /** The receipt key for a guest payment made on this device, if any. */
  tokenFor: (contributionId: string): string | undefined => all()[contributionId],
  save(contributionId: string, token: string) {
    cache = { ...all(), [contributionId]: token };
    SecureStore.setItemAsync(KEY, JSON.stringify(cache)).catch(() => {});
  },
};
