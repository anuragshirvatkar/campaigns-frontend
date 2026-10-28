import { Rubik_400Regular } from "@expo-google-fonts/rubik/400Regular";
import { Rubik_500Medium } from "@expo-google-fonts/rubik/500Medium";
import { Rubik_600SemiBold } from "@expo-google-fonts/rubik/600SemiBold";
import { Rubik_700Bold } from "@expo-google-fonts/rubik/700Bold";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ToastProvider } from "@/components/ui";
import { AlertHost } from "@/components/ui/alert-dialog";
import { AnimatedSplash } from "@/components/ui/animated-splash";
import { SamLayer } from "@/features/assistant/sam";
import { AuthProvider, useAuth } from "@/features/auth/auth-provider";
import { usePushNotifications } from "@/features/notifications/push";
import { OfflineScreen } from "@/features/offline/offline-screen";
import { prefetchStartup } from "@/api/queries";
import { queryClient } from "@/lib/query-client";
import { colors, fonts } from "@/theme";
import { ThemedTree, ThemeProvider, useTheme } from "@/theme/theme-provider";

// Keep the splash up until fonts and the saved login are ready, so the first screen doesn't flicker
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ThemedStatusBar />
            {/* If fonts fail to load, carry on with the system font rather than a blank app */}
            <RootStack fontsReady={fontsLoaded || !!fontError} />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { ready, isSignedIn, isAdmin } = useAuth();
  usePushNotifications(isSignedIn, isAdmin);
  const appReady = ready && fontsReady;

  // As soon as we know who's signed in, start loading what the tabs show (alongside fonts + splash)
  useEffect(() => {
    if (ready) prefetchStartup(queryClient, isSignedIn, isAdmin);
  }, [ready, isSignedIn, isAdmin]);

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  return (
    <>
      {appReady && (
        <ThemedTree>
          <AppStack isSignedIn={isSignedIn} isAdmin={isAdmin} />
          <SamLayer />
          <OfflineScreen />
          <AlertHost />
        </ThemedTree>
      )}
      <AnimatedSplash ready={appReady} />
    </>
  );
}

function AppStack({ isSignedIn, isAdmin }: { isSignedIn: boolean; isAdmin: boolean }) {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        // One consistent, native slide for every pushed screen
        animation: "slide_from_right",
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* The admin gets their own app: review queue, analytics and account, nothing else */}
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="(admin)" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="admin/campaign/[id]" options={{ title: "Review campaign" }} />
      </Stack.Protected>

      <Stack.Protected guard={!isAdmin}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
      {/* Browsing is open to everyone; login opens as a modal when an action needs it */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: "modal" }} />
      </Stack.Protected>

      <Stack.Screen name="campaign/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="campaign/[id]/back" options={{ title: "Back this campaign" }} />
      <Stack.Screen name="campaign/[id]/report" options={{ title: "Distribution report" }} />
      <Stack.Screen name="campaign/[id]/comments" options={{ title: "Comments" }} />

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="create/[id]/index" options={{ title: "Create campaign" }} />
        <Stack.Screen name="create/[id]/submitted" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="create/voice" options={{ title: "Create with voice" }} />
        <Stack.Screen name="create/sam" options={{ title: "Create with Sam", gestureEnabled: false }} />
        <Stack.Screen name="manage/[id]" options={{ title: "Manage campaign" }} />
        <Stack.Screen name="my-campaigns" options={{ title: "My campaigns" }} />
        <Stack.Screen name="backed" options={{ title: "Backed campaigns" }} />
        <Stack.Screen name="following" options={{ title: "Following" }} />
        <Stack.Screen name="payments" options={{ title: "Payment history" }} />
        <Stack.Screen name="settings" options={{ title: "Account settings" }} />
      </Stack.Protected>

      {/* Open to guests: a guest payment's receipt is unlocked by the key saved at checkout */}
      <Stack.Screen name="receipt/[id]" options={{ title: "Receipt" }} />
      </Stack.Protected>
      <Stack.Screen name="info/[page]" options={{ title: "" }} />
    </Stack>
  );
}
