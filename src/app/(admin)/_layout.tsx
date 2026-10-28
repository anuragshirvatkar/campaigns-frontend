// The admin's app: review queue, platform analytics and account. Shown instead of the user tabs.
import { Tabs } from "expo-router";
import { useAdminCampaigns } from "@/api/queries";
import { BlurScreen, TabBar } from "@/components/ui/tab-bar";

export const unstable_settings = { initialRouteName: "review" };

export default function AdminLayout() {
  const pending = useAdminCampaigns("pending").data?.counts.pending ?? 0;
  return (
    <Tabs
      screenOptions={{ headerShown: false, lazy: false, freezeOnBlur: true, animation: "fade" }}
      tabBar={(props) => <TabBar {...props} />}
      // Each screen is a blur target, so the glass tab bar can blur what's behind it
      screenLayout={({ children, route }) => <BlurScreen routeKey={route.key}>{children}</BlurScreen>}
    >
      <Tabs.Screen name="review" options={{ title: "Submissions", tabBarBadge: pending > 0 ? (pending > 9 ? "9+" : pending) : undefined }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
