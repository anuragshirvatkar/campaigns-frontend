import { Stack, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Bubbles, EmptyState, Screen, Text } from "@/components/ui";
import { INFO_GROUPS, PAGES } from "@/features/info/content";
import { colors, radius, spacing, themed } from "@/theme";

export default function InfoScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const group = INFO_GROUPS.find((g) => g.key === page && g.pages.length > 1);
  const content = PAGES.find((p) => p.page === page);

  if (group) return <GroupScreen group={group} />;
  if (!content) return <EmptyState icon="document-text-outline" title="Page not found" />;

  return (
    <Screen>
      <Stack.Screen options={{ title: content.title }} />
      <View style={styles.intro}>
        <View style={styles.decor}>
          <Bubbles />
        </View>
        <Text variant="overline">Campaigns</Text>
        <Text variant="h1">{content.title}</Text>
        <Text variant="body" color={colors.textMuted}>
          {content.intro}
        </Text>
      </View>
      <View style={{ gap: spacing.xl }}>
        {content.sections.map((s) => (
          <View key={s.heading} style={{ gap: spacing.xs }}>
            <Text variant="h3" accessibilityRole="header">
              {s.heading}
            </Text>
            <Text variant="body">{s.body}</Text>
            {s.email && <EmailLink email={s.email} />}
          </View>
        ))}
      </View>
    </Screen>
  );
}

/** Several pages read as one, each under its own heading. */
function GroupScreen({ group }: { group: (typeof INFO_GROUPS)[number] }) {
  const pages = group.pages.map((p) => PAGES.find((x) => x.page === p)).filter((p) => p !== undefined);
  return (
    <Screen>
      <Stack.Screen options={{ title: group.title }} />
      <View style={styles.intro}>
        <View style={styles.decor}>
          <Bubbles />
        </View>
        <Text variant="overline">Campaigns</Text>
        <Text variant="h1">{group.title}</Text>
        <Text variant="body" color={colors.textMuted}>
          {group.intro}
        </Text>
      </View>
      <View style={{ gap: spacing.huge }}>
        {pages.map((p) => (
          <View key={p.page} style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="h2" accessibilityRole="header">
                {p.title}
              </Text>
              <Text variant="body" color={colors.textMuted}>
                {p.intro}
              </Text>
            </View>
            {p.sections.map((s) => (
              <View key={s.heading} style={{ gap: spacing.xs }}>
                <Text variant="h3">{s.heading}</Text>
                <Text variant="body">{s.body}</Text>
                {s.email && <EmailLink email={s.email} />}
              </View>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

/** Tappable email address that opens the mail app. */
function EmailLink({ email }: { email: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Email ${email}`}
      onPress={() => Linking.openURL(`mailto:${email}`)}
      style={({ pressed }) => [styles.email, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="mail-outline" size={18} color={colors.primary} />
      <Text variant="title" color={colors.primary} style={{ flexShrink: 1 }}>
        {email}
      </Text>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  email: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  // Circles stay in the top-right corner, clear of the text
  decor: { position: "absolute", top: 4, right: 4, width: 110, height: 84 },
  intro: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryTint,
    marginBottom: spacing.xxl,
    overflow: "hidden",
  },
}));
