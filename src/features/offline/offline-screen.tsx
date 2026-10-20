// Covers the app with the "no internet" animation whenever the phone loses its connection, and
// lifts it (refreshing data) as soon as the connection is back.
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { EmptyState } from "@/components/ui";
import { env } from "@/config/env";
import { colors, spacing, themed } from "@/theme";

// Asks our own server; any HTTP answer means we're online
async function serverReachable() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(env.apiUrl + "/health", { signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// No network at all is trusted as-is. Android's "internet reachable" flag can stay stuck at false
// after the app resumes, so that one is only believed once our server also fails to answer.
async function checkOffline(s: Network.NetworkState) {
  if (s.isConnected === false) return true;
  if (s.isInternetReachable === false) return !(await serverReachable());
  return false;
}

// One shared status for the screen and React Query
let offline = false;
const listeners = new Set<(v: boolean) => void>();
function setOffline(v: boolean) {
  if (v === offline) return;
  offline = v;
  listeners.forEach((l) => l(v));
}
let seq = 0;
async function refresh(state?: Network.NetworkState) {
  const id = ++seq;
  const s = state ?? (await Network.getNetworkStateAsync().catch(() => null));
  const v = s ? await checkOffline(s) : !(await serverReachable());
  if (id === seq) setOffline(v); // a newer check wins
}

Network.addNetworkStateListener((s) => void refresh(s));
AppState.addEventListener("change", (s) => {
  if (s === "active") void refresh();
});

// Queries pause while offline and refetch on reconnect
onlineManager.setEventListener((setOnline) => {
  const l = (v: boolean) => setOnline(!v);
  listeners.add(l);
  return () => listeners.delete(l);
});

export function OfflineScreen() {
  const [isOffline, setIsOffline] = useState(offline);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    listeners.add(setIsOffline);
    void refresh();
    return () => {
      listeners.delete(setIsOffline);
    };
  }, []);

  if (!isOffline) return null;

  const retry = async () => {
    setChecking(true);
    if (await serverReachable()) setOffline(false);
    else await refresh();
    setChecking(false);
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.screen} accessibilityViewIsModal>
      <View style={styles.center}>
        <EmptyState
          icon="cloud-offline-outline"
          animation="offline"
          tone="danger"
          title="You're offline"
          body="Check your Wi-Fi or mobile data. Everything picks up where you left off once you're back online."
          actionLabel={checking ? "Checking…" : "Try again"}
          onAction={retry}
        />
      </View>
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    screen: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 900, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", paddingBottom: spacing.huge },
  }),
);
