// Small form building blocks used across the five creation steps.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import type { UploadPurpose } from "@/api/platform";
import { ApiError } from "@/api/client";
import { Card, Chip, Text } from "@/components/ui";
import { pickMedia, uploadAsset } from "@/lib/media";
import { colors, fonts, radius, spacing, themed } from "@/theme";
import { AiBadge, GenerateImageSheet, isAiImage } from "./generate-image";
import { PreviewImage } from "./preview-image";

export function FieldGroup({
  title,
  hint,
  children,
  required,
  error,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View>
        <Text variant="title" style={{ fontSize: 14 }}>
          {title}
          {required && <Text color={colors.danger}> *</Text>}
        </Text>
        {hint && <Text variant="caption">{hint}</Text>}
      </View>
      {children}
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
    </View>
  );
}

/** Step title with one short line, and an optional small action on the right (e.g. "Use AI"). */
export function StepIntro({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.intro}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="h2">{title}</Text>
        <Text variant="bodySm">{body}</Text>
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          hitSlop={8}
          style={({ pressed }) => [styles.pill, pressed && { backgroundColor: colors.primaryTint }]}
        >
          <Ionicons name="bulb" size={14} color={colors.primary} />
          <Text variant="title" color={colors.primary} style={{ fontSize: 13 }}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** A labelled white card that groups related fields. */
export function FormSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text variant="overline" color={colors.textMuted} style={{ marginBottom: spacing.md }}>
        {label}
      </Text>
      <Card style={{ gap: spacing.xl }}>{children}</Card>
    </View>
  );
}

/** Image slot: shows the picked image, or a dashed drop zone. Uploads immediately. */
export function ImageField({
  url,
  onChange,
  purpose,
  label,
  hint,
  aspect = 1200 / 630,
  generate,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  purpose: UploadPurpose;
  label: string;
  hint?: string;
  aspect?: number;
  /** Offer "Generate" next to "Upload", pre-filled with this description */
  generate?: { kind: "cover" | "ad"; suggestion: string };
}) {
  const [busy, setBusy] = useState(false);
  // The photo being uploaded, shown from the phone right away
  const [pending, setPending] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    const asset = await pickMedia();
    if (!asset) return;
    setPending(asset.uri);
    setBusy(true);
    try {
      const uploaded = await uploadAsset(asset, purpose);
      onChange(uploaded.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {pending || url ? (
        <View style={[styles.drop, styles.dropFilled, { aspectRatio: aspect }]}>
          <PreviewImage url={(pending ?? url)!} />
          {!pending && url && isAiImage(url) && <AiBadge />}
          {busy && <Busy />}
        </View>
      ) : (
        <View style={[styles.drop, { aspectRatio: aspect }]}>
          {busy ? (
            <Busy />
          ) : (
            <View style={styles.dropInner}>
              <Ionicons name="image-outline" size={28} color={colors.primaryMuted} />
              {hint && (
                <Text variant="caption" align="center">
                  {hint}
                </Text>
              )}
              <View style={styles.dropActions}>
                <Chip size="sm" icon="cloud-upload-outline" label="Upload" onPress={pick} />
                {generate && <Chip size="sm" icon="color-palette-outline" label="Generate" onPress={() => setGenOpen(true)} />}
              </View>
            </View>
          )}
        </View>
      )}
      {url && !busy && (
        <View style={styles.actions}>
          <Chip size="sm" icon="swap-horizontal-outline" label="Replace" onPress={pick} />
          {generate && <Chip size="sm" icon="color-palette-outline" label="Generate" onPress={() => setGenOpen(true)} />}
          <Chip size="sm" icon="trash-outline" label="Remove" onPress={() => onChange(null)} />
        </View>
      )}
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
      {generate && (
        <GenerateImageSheet
          visible={genOpen}
          kind={generate.kind}
          suggestion={generate.suggestion}
          onClose={() => setGenOpen(false)}
          onUse={(img) => onChange(img.url)}
        />
      )}
    </View>
  );
}

function Busy() {
  return (
    <View style={styles.busy}>
      <ActivityIndicator color={colors.textOnDark} />
      <Text variant="caption" color={colors.textOnDark}>
        Uploading…
      </Text>
    </View>
  );
}

/** Free-text tags (locations, interests): type and press add/enter. */
export function TagInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  max = 20,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions?: string[];
  max?: number;
}) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || values.some((x) => x.toLowerCase() === v.toLowerCase()) || values.length >= max) return;
    onChange([...values, v]);
    setText("");
  };
  const remaining = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.tagInput}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          onSubmitEditing={() => add(text)}
          blurOnSubmit={false}
          maxLength={60}
          returnKeyType="done"
          style={styles.tagText}
          accessibilityLabel={placeholder}
          maxFontSizeMultiplier={1.4}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add"
          disabled={!text.trim()}
          onPress={() => add(text)}
          style={[styles.addBtn, !text.trim() && { opacity: 0.4 }]}
        >
          <Ionicons name="add" size={20} color={colors.textOnDark} />
        </Pressable>
      </View>
      {values.length > 0 && (
        <View style={styles.wrap}>
          {values.map((v) => (
            <Chip key={v} label={v} selected size="sm" onRemove={() => onChange(values.filter((x) => x !== v))} />
          ))}
        </View>
      )}
      {remaining.length > 0 && (
        <View style={styles.wrap}>
          {remaining.slice(0, 8).map((s) => (
            <Chip key={s} label={s} icon="add" size="sm" onPress={() => add(s)} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Number stepper (ages, budget split). */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  label: string;
}) {
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${value}${suffix}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepBtn, value <= min && { opacity: 0.35 }]}
      >
        <Ionicons name="remove" size={18} color={colors.primary} />
      </Pressable>
      <Text variant="h3" style={styles.stepValue}>
        {value}
        {suffix}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepBtn, value >= max && { opacity: 0.35 }]}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

/** Checkbox row (rules confirmation). */
export function CheckRow({
  checked,
  onToggle,
  children,
  error,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onToggle}
        style={[styles.check, checked && styles.checkOn, !!error && { borderColor: colors.danger }]}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked && <Ionicons name="checkmark" size={16} color={colors.textOnDark} />}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Pressable>
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  drop: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  dropFilled: { borderStyle: "solid", borderColor: colors.border },
  dropInner: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
  dropActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  intro: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primaryMuted,
    marginTop: 2,
  },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", gap: 6 },
  actions: { flexDirection: "row", gap: spacing.sm },
  tagInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    minHeight: 52,
  },
  tagText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 12 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    alignSelf: "flex-start",
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { minWidth: 52, textAlign: "center" },
  check: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
}));
