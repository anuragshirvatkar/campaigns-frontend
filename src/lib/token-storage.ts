import * as SecureStore from "expo-secure-store";
import type { UserRole } from "@/api/types";

// The JWT lives in the OS keystore, not plain storage. Logging out = deleting it.
const KEY = "auth_token";
// Saved next to it so the right app (user or admin) opens at launch, even offline
const ROLE_KEY = "auth_role";

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => Promise.all([SecureStore.deleteItemAsync(KEY), SecureStore.deleteItemAsync(ROLE_KEY)]).then(() => {}),
  getRole: async (): Promise<UserRole> => ((await SecureStore.getItemAsync(ROLE_KEY)) === "admin" ? "admin" : "user"),
  setRole: (role: UserRole) => SecureStore.setItemAsync(ROLE_KEY, role),
};
