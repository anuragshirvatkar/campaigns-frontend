import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/api/auth";
import { setAuthToken, setUnauthorizedHandler } from "@/api/client";
import type { AuthResponse, Me } from "@/api/types";
import { unregisterPushToken } from "@/features/notifications/push";
import { tokenStorage } from "@/lib/token-storage";
import { signOutOfGoogle } from "./google-sign-in";

type AuthContextValue = {
  /** False until the saved token has been read; keep the splash screen up until then */
  ready: boolean;
  isSignedIn: boolean;
  /** Null while loading or offline on first launch; screens can still treat the user as signed in */
  user: Me | null;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const meQueryKey = ["me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    await unregisterPushToken(); // while still authenticated
    signOutOfGoogle(); // so the next Google sign-in offers the account picker
    setAuthToken(null);
    setToken(null);
    queryClient.clear(); // drop every cached response tied to the old account
    await tokenStorage.clear();
  }, [queryClient]);

  const signIn = useCallback(
    async ({ token: newToken, user }: AuthResponse) => {
      await tokenStorage.set(newToken);
      setAuthToken(newToken);
      // Show the name immediately; the counts arrive with the refetch
      queryClient.setQueryData<Me>(meQueryKey, { ...user, counts: { createdCount: 0, backedCount: 0, followingCount: 0 } });
      setToken(newToken);
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
    [queryClient],
  );

  useEffect(() => {
    // An expired or revoked token anywhere in the app logs the user out
    setUnauthorizedHandler(() => void signOut());
    tokenStorage
      .get()
      .then((saved) => {
        setAuthToken(saved);
        setToken(saved);
      })
      .catch(() => {}) // unreadable keystore → start signed out
      .finally(() => setReady(true));
  }, [signOut]);

  const { data: user } = useQuery({ queryKey: meQueryKey, queryFn: authApi.me, enabled: token !== null });

  const value = useMemo<AuthContextValue>(
    () => ({ ready, isSignedIn: token !== null, user: user ?? null, signIn, signOut }),
    [ready, token, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
