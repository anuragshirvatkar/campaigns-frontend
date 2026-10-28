import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { queueHello } from "@/features/assistant/bridge";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/api/auth";
import { setAuthToken, setUnauthorizedHandler } from "@/api/client";
import type { AuthResponse, Me, UserRole } from "@/api/types";
import { unregisterPushToken } from "@/features/notifications/push";
import { tokenStorage } from "@/lib/token-storage";
import { signOutOfGoogle } from "./google-sign-in";

type AuthContextValue = {
  /** False until the saved token has been read; keep the splash screen up until then */
  ready: boolean;
  isSignedIn: boolean;
  /** Signed in as the platform admin: the app shows the admin screens instead of the tabs */
  isAdmin: boolean;
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
  const [role, setRole] = useState<UserRole>("user");
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    await unregisterPushToken(); // while still authenticated
    signOutOfGoogle(); // so the next Google sign-in offers the account picker
    setAuthToken(null);
    setToken(null);
    setRole("user");
    queryClient.clear(); // drop every cached response tied to the old account
    await tokenStorage.clear();
  }, [queryClient]);

  const signIn = useCallback(
    async ({ token: newToken, user }: AuthResponse) => {
      await tokenStorage.set(newToken);
      await tokenStorage.setRole(user.role);
      setAuthToken(newToken);
      setRole(user.role);
      // Show the name immediately; the counts arrive with the refetch
      queryClient.setQueryData<Me>(meQueryKey, { ...user, counts: { createdCount: 0, backedCount: 0, followingCount: 0 } });
      // Users land on Home after signing in, wherever the sign-in was opened from (the admin has their own app)
      if (user.role !== "admin") {
        queueHello(); // Sam greets them on Home
        router.navigate("/");
      }
      setToken(newToken);
      // Fetched now rather than just marked stale: the profile query is still disabled at this point,
      // so an invalidate alone would leave the placeholder zeros on screen
      void queryClient.fetchQuery({ queryKey: meQueryKey, queryFn: authApi.me, staleTime: 0 }).catch(() => {});
    },
    [queryClient],
  );

  useEffect(() => {
    // An expired or revoked token anywhere in the app logs the user out
    setUnauthorizedHandler(() => void signOut());
    Promise.all([tokenStorage.get(), tokenStorage.getRole()])
      .then(([saved, savedRole]) => {
        setAuthToken(saved);
        setToken(saved);
        setRole(savedRole);
      })
      .catch(() => {}) // unreadable keystore → start signed out
      .finally(() => setReady(true));
  }, [signOut]);

  const { data: user } = useQuery({ queryKey: meQueryKey, queryFn: authApi.me, enabled: token !== null });

  const value = useMemo<AuthContextValue>(
    // The saved role decides at launch; the profile, once loaded, has the final word
    () => ({ ready, isSignedIn: token !== null, isAdmin: token !== null && (user?.role ?? role) === "admin", user: user ?? null, signIn, signOut }),
    [ready, token, role, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
