// Campaign & ad visuals: kept separate from the story. Cover, ad creatives, ad copy,
// placement previews, warnings for missing assets and optional AI creative feedback.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "@/api/client";
import { platformApi } from "@/api/platform";
import type { Channel } from "@/api/types";
import { Button, Card, Chip, Note, Text, TextField } from "@/components/ui";
import { AdPreview } from "@/features/campaigns/ad-preview";
import { pickMedia, uploadAsset } from "@/lib/media";
import { colors, radius, spacing, themed } from "@/theme";
import { FieldGroup, FormSection, StepIntro } from "./form-parts";
import { AiBadge, GenerateImageSheet } from "./generate-image";
import { PreviewImage } from "./preview-image";
import { imageSuggestion } from "./step-basics";
import { localId, type DraftForm, type FieldErrors } from "./use-draft";

type Props = { form: DraftForm; set: <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => void; errors: FieldErrors };

const CTA_SUGGESTIONS = ["Learn more", "Read the story", "Take action", "Sign up", "Share"];

export function StepVisuals({ form, set, errors }: Props) {
  const [placement, setPlacement] = useState<Channel>("facebook");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const firstImage = form.adAssets.find((a) => a.type === "image")?.url ?? form.coverImageUrl;
  const feedback = useMutation({
    mutationFn: () =>
      platformApi.creativeFeedback({
        imageUrl: firstImage!,
        title: form.title || undefined,
        adHeadline: form.adHeadline || undefined,
        adDescription: form.adDescription || undefined,
        ctaText: form.ctaText || undefined,
      }),
  });

  const addAsset = async () => {
    setUploadError(null);
    const asset = await pickMedia(["images", "videos"]);
    if (!asset) return;
    // Basic checks before uploading; the server re-checks everything
    if (asset.type === "video" && asset.duration && asset.duration > 60_500)
      return setUploadError("Videos can be at most 60 seconds.");
    if (asset.fileSize && asset.fileSize > (asset.type === "video" ? 50 : 10) * 1024 * 1024) {
      return setUploadError(asset.type === "video" ? "Videos can be at most 50 MB." : "Images can be at most 10 MB.");
    }
    setUploading(true);
    try {
      const up = await uploadAsset(asset, "ad");
      set("adAssets", [
        ...form.adAssets,
        {
          id: localId("a"),
          type: up.type,
          url: up.url,
          width: up.width,
          height: up.height,
          ...(up.durationSec ? { durationSec: up.durationSec } : {}),
        },
      ]);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const warnings = [
    !form.adHeadline.trim() && "No ad headline: the start of your title will be used.",
  ].filter(Boolean) as string[];

  return (
    <View style={{ gap: spacing.xl }}>
      <StepIntro title="Visuals" body="What people see in their feed before they read the story." />


      <FieldGroup
        title={`Ad images & videos (${form.adAssets.length}/10)`}
        required
        hint="At least one square image. Videos up to 60 seconds are optional extras."
        error={errors.adAssets}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {form.adAssets.map((a) => (
            <View key={a.id} style={styles.asset}>
              {a.type === "image" ? (
                <>
                  <PreviewImage url={a.url} />
                  {a.aiGenerated && <AiBadge style={{ top: 6, left: 6 }} />}
                </>
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.video]}>
                  <Ionicons name="videocam" size={26} color={colors.textOnDark} />
                  <Text variant="caption" color={colors.textOnDark}>
                    {a.durationSec ? `${Math.round(a.durationSec)}s video` : "Video"}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove creative"
                onPress={() =>
                  set(
                    "adAssets",
                    form.adAssets.filter((x) => x.id !== a.id),
                  )
                }
                style={styles.remove}
                hitSlop={6}
              >
                <Ionicons name="close" size={14} color={colors.textOnDark} />
              </Pressable>
            </View>
          ))}
          {form.adAssets.length < 10 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload ad image or video"
              onPress={addAsset}
              disabled={uploading}
              style={[styles.asset, styles.addAsset]}
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="add" size={28} color={colors.primary} />
              )}
              <Text variant="caption" color={colors.primary}>
                {uploading ? "Uploading…" : "Upload"}
              </Text>
            </Pressable>
          )}
          {form.adAssets.length < 10 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Generate an ad image with AI"
              onPress={() => setGenOpen(true)}
              style={[styles.asset, styles.addAsset]}
            >
              <Ionicons name="bulb-outline" size={24} color={colors.primary} />
              <Text variant="caption" color={colors.primary}>
                Generate
              </Text>
            </Pressable>
          )}
        </ScrollView>
        {uploadError && (
          <Text variant="caption" color={colors.danger}>
            {uploadError}
          </Text>
        )}
        <GenerateImageSheet
          visible={genOpen}
          kind="ad"
          suggestion={imageSuggestion(form)}
          onClose={() => setGenOpen(false)}
          onUse={(img) =>
            set("adAssets", [
              ...form.adAssets,
              { id: localId("a"), type: "image", url: img.url, width: img.width, height: img.height, aiGenerated: true },
            ])
          }
        />
      </FieldGroup>

      <FormSection label="Ad text">
        <TextField
          label="Headline"
          value={form.adHeadline}
          onChangeText={(v) => set("adHeadline", v)}
          maxLength={60}
          showCounter
          placeholder={form.title ? form.title.slice(0, 40) : "Short and specific"}
          hint="Leave empty to use the start of your title."
        />
        <TextField
          label="Description"
          value={form.adDescription}
          onChangeText={(v) => set("adDescription", v)}
          maxLength={200}
          showCounter
          multiline
          minLines={2}
          placeholder="One or two lines that make people want to read the story"
        />
        <FieldGroup title="Button">
          <TextField value={form.ctaText} onChangeText={(v) => set("ctaText", v)} maxLength={30} placeholder="Learn more" />
          <View style={styles.wrap}>
            {CTA_SUGGESTIONS.map((c) => (
              <Chip key={c} size="sm" label={c} selected={form.ctaText === c} onPress={() => set("ctaText", c)} />
            ))}
          </View>
        </FieldGroup>
      </FormSection>

      {warnings.length > 0 && (
        <Note tone="warning">
          <View style={{ gap: 4 }}>
            {warnings.map((w) => (
              <Text key={w} variant="bodySm" color={colors.text}>
                • {w}
              </Text>
            ))}
          </View>
        </Note>
      )}

      <FieldGroup title="Preview" hint="Roughly how it may appear. Final placements are set during review.">
        <View style={styles.wrap}>
          <Chip
            label="Facebook feed"
            icon="logo-facebook"
            selected={placement === "facebook"}
            onPress={() => setPlacement("facebook")}
          />
          <Chip
            label="Instagram feed"
            icon="logo-instagram"
            selected={placement === "instagram"}
            onPress={() => setPlacement("instagram")}
          />
        </View>
        <AdPreview
          placement={placement}
          creatorName={form.creatorName}
          headline={form.adHeadline || form.title.slice(0, 40)}
          description={form.adDescription}
          ctaText={form.ctaText}
          imageUrl={firstImage}
        />
      </FieldGroup>

      <Card tone="tinted" style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <Ionicons name="bulb" size={18} color={colors.primary} />
          <Text variant="title" style={{ flex: 1 }}>
            Get AI feedback
          </Text>
        </View>
        <Text variant="bodySm">Optional tips on your ad image and text.</Text>
        {feedback.data ? (
          <View style={{ gap: spacing.sm }}>
            {feedback.data.mode === "demo" && <Note tone="warning">AI is unavailable, so this is demo feedback.</Note>}
            <Text variant="overline" color={colors.success}>
              Working well
            </Text>
            {feedback.data.strengths.map((s) => (
              <Text key={s} variant="bodySm" color={colors.text}>
                ✓ {s}
              </Text>
            ))}
            <Text variant="overline" color={colors.warning}>
              Consider
            </Text>
            {feedback.data.suggestions.map((s) => (
              <Text key={s} variant="bodySm" color={colors.text}>
                → {s}
              </Text>
            ))}
          </View>
        ) : null}
        {feedback.isError && (
          <Note tone="danger">
            {feedback.error instanceof ApiError ? feedback.error.message : "Feedback is unavailable right now."}
          </Note>
        )}
        <Button
          label={feedback.data ? "Get feedback again" : "Get feedback"}
          variant="secondary"
          icon="bulb-outline"
          loading={feedback.isPending}
          disabled={!firstImage}
          onPress={() => feedback.mutate()}
        />
        {!firstImage && <Text variant="caption">Add a cover or ad image first.</Text>}
      </Card>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  asset: { width: 104, height: 104, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface },
  addAsset: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
  },
  video: { backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", gap: 4 },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
}));
