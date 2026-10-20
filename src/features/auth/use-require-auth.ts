import { router } from "expo-router";
import { useCallback } from "react";
import { useAuth } from "./auth-provider";

/**
 * Browsing never needs an account; actions like backing, following or commenting do.
 * Wrap those actions: signed in → runs; signed out → opens login, then the user taps again.
 */
export function useRequireAuth() {
  const { isSignedIn } = useAuth();
  return useCallback(
    (action: () => void) => {
      if (isSignedIn) action();
      else router.push("/login");
    },
    [isSignedIn],
  );
}
