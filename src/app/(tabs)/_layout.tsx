import { Tabs } from "expo-router";
import { useUnreadCount } from "@/api/queries";
import { BlurScreen, TabBar } from "@/components/ui/tab-bar";

export default function TabsLayout() {
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Every tab is built at launch, behind the splash animation, so switching is instant
        lazy: false,
        // Hidden tabs pause re-rendering; they catch up when shown again
        freezeOnBlur: true,
        animation: "fade",
      }}
      tabBar={(props) => <TabBar {...props} />}
      // Each screen is a blur target, so the glass tab bar can blur what's behind it
      screenLayout={({ children, route }) => <BlurScreen routeKey={route.key}>{children}</BlurScreen>}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarBadge: count > 0 ? (count > 9 ? "9+" : count) : undefined }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
