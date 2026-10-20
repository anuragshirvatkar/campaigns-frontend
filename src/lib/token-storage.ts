import * as SecureStore from "expo-secure-store";

// The JWT lives in the OS keystore, not plain storage. Logging out = deleting it.
const KEY = "auth_token";

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
