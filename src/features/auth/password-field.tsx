import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, TextField } from "@/components/ui";
import { colors, spacing, themed } from "@/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string | null;
  showStrength?: boolean;
  autoComplete?: "password" | "new-password" | "current-password";
  onSubmitEditing?: () => void;
};

/** Password input with show/hide and, for new passwords, the reference's segmented strength meter. */
export function PasswordField({ label, value, onChangeText, error, showStrength, autoComplete = "password", onSubmitEditing }: Props) {
  const [visible, setVisible] = useState(false);
  const checks = [
    { ok: value.length >= 8, label: "8+ characters" },
    { ok: /[A-Z]/.test(value) && /[a-z]/.test(value), label: "Upper & lower case" },
    { ok: /\d/.test(value), label: "A number" },
    { ok: /[^A-Za-z0-9]/.test(value), label: "A symbol" },
  ];
  const score = checks.filter((c) => c.ok).length;

  return (
    <View style={{ gap: spacing.sm }}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={autoComplete === "new-password" ? "newPassword" : "password"}
        returnKeyType="go"
        onSubmitEditing={onSubmitEditing}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setVisible((v) => !v)}
          >
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
          </Pressable>
        }
      />
      {showStrength && value.length > 0 && (
        <View style={{ gap: spacing.sm }} accessibilityLabel={`Password strength ${score} of 4`}>
          <View style={styles.bars}>
            {checks.map((_, i) => (
              <View key={i} style={[styles.bar, { backgroundColor: i < score ? colors.primary : colors.primarySoft }]} />
            ))}
          </View>
          <View style={styles.checks}>
            {checks.map((c) => (
              <View key={c.label} style={styles.check}>
                <Ionicons
                  name={c.ok ? "checkmark-circle" : "ellipse-outline"}
                  size={13}
                  color={c.ok ? colors.success : colors.textSubtle}
                />
                <Text variant="caption">{c.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bars: { flexDirection: "row", gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  checks: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  check: { width: "50%", flexDirection: "row", alignItems: "center", gap: 4 },
}));
