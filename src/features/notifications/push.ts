// Phone push notifications: permission, Expo push token registration and tap-to-open.
// Expo Go doesn't ship the notifications native module, so the library is only loaded in a
// development or release build; in Expo Go all of this quietly does nothing.
import { useQueryClient } from "@tanstack/react-query";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { engageApi } from "@/api/engage";

type NotificationsModule = typeof import("expo-notifications");
type NotificationResponse = import("expo-notifications").NotificationResponse;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Notifications: NotificationsModule | null = (() => {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as NotificationsModule;
  } catch {
    return null;
  }
})();

// Show pushes as banners even while the app is open
Notifications?.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let registeredToken: string | null = null;

async function getPushToken(N: NotificationsModule): Promise<string | null> {
  if (!Device.isDevice) return null;
  // Android 13+ only shows the permission prompt once a channel exists
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("default", {
      name: "Campaign updates",
      importance: N.AndroidImportance.HIGH,
      lightColor: "#6847FD",
    });
  }
  let { status } = await N.getPermissionsAsync();
  if (status !== "granted") status = (await N.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  return (await N.getExpoPushTokenAsync({ projectId })).data;
}

/** Call before the auth token is cleared, so this device stops getting the old account's pushes. */
export async function unregisterPushToken() {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await engageApi.removePushToken(token).catch(() => {});
}

function dataOf(response: NotificationResponse | null, key: "campaignId" | "contributionId") {
  const v = response?.notification.request.content.data?.[key];
  return typeof v === "string" ? v : null;
}

/** Payment pushes open their receipt; everything else opens the campaign. */
function openFromPush(response: NotificationResponse | null, isAdmin: boolean) {
  const contributionId = dataOf(response, "contributionId");
  const campaignId = dataOf(response, "campaignId");
  // The admin's pushes are new submissions: open them for review
  if (isAdmin) {
    if (campaignId) router.push({ pathname: "/admin/campaign/[id]", params: { id: campaignId } });
    return;
  }
  if (contributionId) router.push({ pathname: "/receipt/[id]", params: { id: contributionId } });
  else if (campaignId) router.push({ pathname: "/campaign/[id]", params: { id: campaignId } });
}

/** Registers this device for pushes while signed in, and opens the campaign when a push is tapped. */
export function usePushNotifications(isSignedIn: boolean, isAdmin = false) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSignedIn || !Notifications) return;
    getPushToken(Notifications)
      .then((token) => {
        if (!token) return;
        registeredToken = token;
        return engageApi.savePushToken(token);
      })
      .catch(() => {}); // no permission or offline: the Activity tab still works
  }, [isSignedIn]);

  useEffect(() => {
    if (!Notifications) return;
    const N = Notifications;
    // The push that launched the app from closed
    N.getLastNotificationResponseAsync()
      .then((response) => {
        openFromPush(response, isAdmin);
        return N.clearLastNotificationResponseAsync();
      })
      .catch(() => {});

    // A push arriving means there is something new in Activity
    const received = N.addNotificationReceivedListener(() => {
      // Same keys as keys.unread / keys.notifications in api/queries (not imported: queries -> auth -> push)
      void qc.invalidateQueries({ queryKey: ["unread"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["admin"] }); // a new submission for the admin
    });
    // Tapped while the app was open or in the background
    const tapped = N.addNotificationResponseReceivedListener((response) => openFromPush(response, isAdmin));
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [qc, isAdmin]);
}
