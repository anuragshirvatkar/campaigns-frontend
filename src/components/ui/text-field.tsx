import { forwardRef, useState, type ReactNode } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, fonts, radius, spacing, themed } from "@/theme";
import { Text } from "./text";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  /** Shows "12/60" when set together with maxLength */
  showCounter?: boolean;
  prefix?: string;
  right?: ReactNode;
  minLines?: number;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  {
    label,
    hint,
    error,
    required,
    showCounter,
    prefix,
    right,
    minLines = 4,
    multiline,
    value,
    maxLength,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const length = value?.length ?? 0;

  return (
    <View style={styles.wrap}>
      {(label || (showCounter && maxLength)) && (
        <View style={styles.labelRow}>
          {label && (
            <Text variant="title" style={styles.label}>
              {label}
              {required && <Text color={colors.danger}> *</Text>}
            </Text>
          )}
          {showCounter && maxLength ? (
            <Text variant="caption" color={length > maxLength * 0.9 ? colors.warning : colors.textSubtle}>
              {length}/{maxLength}
            </Text>
          ) : null}
        </View>
      )}
      <View
        style={[
          styles.box,
          multiline && { minHeight: minLines * 22 + 24, alignItems: "flex-start" },
          focused && styles.focused,
          !!error && styles.errorBox,
        ]}
      >
        {prefix && (
          <Text variant="title" color={colors.textMuted} style={styles.prefix}>
            {prefix}
          </Text>
        )}
        <TextInput
          ref={ref}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          accessibilityHint={hint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.multiline]}
          textAlignVertical={multiline ? "top" : "center"}
          maxFontSizeMultiplier={1.4}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = themed(() => StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  label: { fontSize: 14 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  focused: { borderColor: colors.primary, backgroundColor: colors.background },
  errorBox: { borderColor: colors.danger },
  prefix: { marginRight: 4 },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  multiline: { lineHeight: 22 },
}));
