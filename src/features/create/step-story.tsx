// Editorial story composer: headline, intro, sections that can be added and reordered,
// a simple formatting toolbar, images with captions, statistics tied to sources, and actions.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Source, StoryBlock } from "@/api/types";
import { Button, Card, Chip, IconButton, Note, Text, TextField } from "@/components/ui";
import { SourceList, StoryBlocks } from "@/features/campaigns/story";
import type { IconName } from "@/lib/labels";
import { colors, fonts, radius, shadow, spacing, themed } from "@/theme";
import { FieldGroup, FormSection, ImageField, StepIntro } from "./form-parts";
import { localId, type DraftForm, type FieldErrors } from "./use-draft";

type Props = {
  form: DraftForm;
  set: <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => void;
  errors: FieldErrors;
};

const BLOCK_TYPES: { type: StoryBlock["type"]; label: string; icon: IconName }[] = [
  { type: "paragraph", label: "Paragraph", icon: "reorder-four-outline" },
  { type: "heading", label: "Heading", icon: "text-outline" },
  { type: "image", label: "Image", icon: "image-outline" },
  { type: "stat", label: "Statistic", icon: "stats-chart-outline" },
  { type: "action", label: "Action", icon: "hand-right-outline" },
];

function emptyBlock(type: StoryBlock["type"]): StoryBlock {
  const id = localId("b");
  switch (type) {
    case "heading":
      return { type, id, text: "" };
    case "paragraph":
      return { type, id, text: "" };
    case "image":
      return { type, id, url: "", caption: "", credit: "" };
    case "stat":
      return { type, id, value: "", label: "" };
    case "action":
      return { type, id, label: "" };
  }
}

export function StepStory({ form, set, errors }: Props) {
  const [preview, setPreview] = useState(false);
  const blocks = form.storyBlocks;

  const update = (i: number, block: StoryBlock) =>
    set(
      "storyBlocks",
      blocks.map((b, j) => (j === i ? block : b)),
    );
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    set("storyBlocks", next);
  };
  const remove = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set(
      "storyBlocks",
      blocks.filter((_, j) => j !== i),
    );
  };
  const add = (type: StoryBlock["type"]) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    set("storyBlocks", [...blocks, emptyBlock(type)]);
  };

  // Image blocks without an uploaded image would fail validation, so they're left out of saves
  return (
    <View style={{ gap: spacing.xl }}>
      <StepIntro title="Story" body="Write it like a short article, with evidence people can check." />

      <FormSection label="Opening">
        <TextField
          label="Headline"
          value={form.storyHeadline}
          onChangeText={(v) => set("storyHeadline", v)}
          maxLength={120}
          placeholder="The headline readers see first"
        />
        <TextField
          label="Introduction"
          value={form.storyIntro}
          onChangeText={(v) => set("storyIntro", v)}
          maxLength={1000}
          multiline
          minLines={3}
          placeholder="Open with what's happening and why the reader should care."
        />
      </FormSection>

      <FieldGroup
        title="Sections"
        hint="Add, edit and reorder. Paragraphs support bold, italic and lists."
        required
        error={errors.storyBlocks}
      >
        <View style={{ gap: spacing.md }}>
          {blocks.length === 0 && (
            <View style={styles.emptyBlocks}>
              <Ionicons name="document-text-outline" size={28} color={colors.primaryMuted} />
              <Text variant="bodySm" align="center">
                Start with a paragraph.
              </Text>
            </View>
          )}
          {blocks.map((b, i) => (
            <BlockEditor
              key={b.id ?? i}
              block={b}
              sources={form.sources}
              index={i}
              count={blocks.length}
              onChange={(nb) => update(i, nb)}
              onMove={(d) => move(i, d)}
              onRemove={() => remove(i)}
            />
          ))}
        </View>
        <View style={styles.addRow}>
          {BLOCK_TYPES.map((t) => (
            <Chip key={t.type} size="sm" icon={t.icon} label={t.label} onPress={() => add(t.type)} />
          ))}
        </View>
      </FieldGroup>

      <SourcesEditor
        sources={form.sources}
        onChange={(s) => {
          set("sources", s);
          // Drop links from statistics to sources that were removed
          const ids = new Set(s.map((x) => x.id));
          if (form.storyBlocks.some((b) => b.type === "stat" && b.sourceId && !ids.has(b.sourceId))) {
            set(
              "storyBlocks",
              form.storyBlocks.map((b) =>
                b.type === "stat" && b.sourceId && !ids.has(b.sourceId) ? { ...b, sourceId: undefined } : b,
              ),
            );
          }
        }}
      />

      <Button label="Live preview" icon="eye-outline" variant="outline" onPress={() => setPreview(true)} />
      <StoryPreview visible={preview} onClose={() => setPreview(false)} form={form} />
    </View>
  );
}

function BlockEditor({
  block,
  sources,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  block: StoryBlock;
  sources: Source[];
  index: number;
  count: number;
  onChange: (b: StoryBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const meta = BLOCK_TYPES.find((t) => t.type === block.type)!;
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <Ionicons name={meta.icon} size={16} color={colors.primary} />
        <Text variant="overline" style={{ flex: 1 }}>
          {meta.label}
        </Text>
        <IconButton icon="arrow-up" label="Move section up" size={18} disabled={index === 0} onPress={() => onMove(-1)} />
        <IconButton
          icon="arrow-down"
          label="Move section down"
          size={18}
          disabled={index === count - 1}
          onPress={() => onMove(1)}
        />
        <IconButton icon="trash-outline" label="Delete section" size={18} color={colors.danger} onPress={onRemove} />
      </View>

      {block.type === "heading" && (
        <TextInput
          value={block.text}
          onChangeText={(text) => onChange({ ...block, text })}
          placeholder="Section heading"
          placeholderTextColor={colors.textSubtle}
          maxLength={120}
          style={[styles.input, { fontFamily: fonts.semibold, fontSize: 18 }]}
          accessibilityLabel="Section heading"
        />
      )}

      {block.type === "paragraph" && <ParagraphEditor text={block.text} onChange={(text) => onChange({ ...block, text })} />}

      {block.type === "image" && (
        <View style={{ gap: spacing.sm }}>
          <ImageField
            url={block.url || null}
            onChange={(url) => onChange({ ...block, url: url ?? "" })}
            purpose="story"
            label="photo"
            aspect={16 / 10}
          />
          <TextInput
            value={block.caption ?? ""}
            onChangeText={(caption) => onChange({ ...block, caption })}
            placeholder="Caption"
            placeholderTextColor={colors.textSubtle}
            maxLength={200}
            style={styles.input}
            accessibilityLabel="Image caption"
          />
          <TextInput
            value={block.credit ?? ""}
            onChangeText={(credit) => onChange({ ...block, credit })}
            placeholder="Image credit (who took it)"
            placeholderTextColor={colors.textSubtle}
            maxLength={120}
            style={styles.input}
            accessibilityLabel="Image credit"
          />
        </View>
      )}

      {block.type === "stat" && (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              value={block.value}
              onChangeText={(value) => onChange({ ...block, value })}
              placeholder="11 of 30"
              placeholderTextColor={colors.textSubtle}
              maxLength={40}
              style={[styles.input, { width: 110, fontFamily: fonts.bold, color: colors.primary }]}
              accessibilityLabel="Statistic value"
            />
            <TextInput
              value={block.label}
              onChangeText={(label) => onChange({ ...block, label })}
              placeholder="What the number means"
              placeholderTextColor={colors.textSubtle}
              maxLength={160}
              multiline
              style={[styles.input, { flex: 1 }]}
              accessibilityLabel="Statistic description"
            />
          </View>
          <Text variant="caption">Source for this number</Text>
          {sources.length === 0 ? (
            <Text variant="caption" color={colors.warning}>
              Add a source below, then link it here.
            </Text>
          ) : (
            <View style={styles.wrap}>
              {sources.map((s, i) => (
                <Chip
                  key={s.id}
                  size="sm"
                  label={`[${i + 1}] ${s.title.slice(0, 24)}`}
                  selected={block.sourceId === s.id}
                  onPress={() => onChange({ ...block, sourceId: block.sourceId === s.id ? undefined : s.id })}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {block.type === "action" && (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={block.label}
            onChangeText={(label) => onChange({ ...block, label })}
            placeholder="What should readers do? e.g. Ask your school board to apply"
            placeholderTextColor={colors.textSubtle}
            maxLength={80}
            style={styles.input}
            accessibilityLabel="Suggested action"
          />
          <TextInput
            value={block.url ?? ""}
            onChangeText={(url) => onChange({ ...block, url: url || undefined })}
            placeholder="Link (optional), https://…"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            keyboardType="url"
            style={styles.input}
            accessibilityLabel="Action link"
          />
        </View>
      )}
    </View>
  );
}

/** Paragraph with a tiny toolbar: wraps the selection in **bold** / *italic*, or starts a bullet line. */
function ParagraphEditor({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  const [sel, setSel] = useState({ start: text.length, end: text.length });
  const wrap = (marker: string) => {
    const { start, end } = sel;
    const chosen = text.slice(start, end) || "text";
    onChange(text.slice(0, start) + marker + chosen + marker + text.slice(end));
  };
  const bullet = () => {
    const lineStart = text.lastIndexOf("\n", Math.max(0, sel.start - 1)) + 1;
    onChange(text.slice(0, lineStart) + "- " + text.slice(lineStart));
  };
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.toolbar}>
        <ToolButton label="Bold" icon="text" bold onPress={() => wrap("**")} />
        <ToolButton label="Italic" icon="text" italic onPress={() => wrap("*")} />
        <ToolButton label="Bullet list" icon="list" onPress={bullet} />
        <Text variant="caption" style={{ marginLeft: "auto" }}>
          {text.length}/5000
        </Text>
      </View>
      <TextInput
        value={text}
        onChangeText={onChange}
        onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
        placeholder="Write this part of the story…"
        placeholderTextColor={colors.textSubtle}
        multiline
        maxLength={5000}
        textAlignVertical="top"
        style={[styles.input, { minHeight: 120, lineHeight: 22 }]}
        accessibilityLabel="Paragraph text"
      />
    </View>
  );
}

function ToolButton({
  label,
  icon,
  onPress,
  bold,
  italic,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tool, pressed && { backgroundColor: colors.primarySoft }]}
    >
      {bold || italic ? (
        <Text variant="title" style={{ fontFamily: bold ? fonts.bold : fonts.regular, fontStyle: italic ? "italic" : "normal" }}>
          {bold ? "B" : "I"}
        </Text>
      ) : (
        <Ionicons name={icon} size={18} color={colors.text} />
      )}
    </Pressable>
  );
}

function SourcesEditor({ sources, onChange }: { sources: Source[]; onChange: (s: Source[]) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [tried, setTried] = useState(false);
  // Shown after the first Add, and re-checked as they type so it clears once the source is valid
  const problem = !title.trim()
    ? "Give the source a title."
    : !/^https?:\/\/\S+\.\S+/.test(url.trim())
      ? "Use a full link starting with https://"
      : null;
  const error = tried ? problem : null;

  const add = () => {
    setTried(true);
    if (problem) return;
    onChange([...sources, { id: localId("s"), title: title.trim(), url: url.trim() }]);
    setTitle("");
    setUrl("");
    setTried(false);
  };

  return (
    <FieldGroup title={`Sources (${sources.length})`} hint="Evidence for your claims. Shown to everyone.">
      {sources.length === 0 && <Note tone="warning">Campaigns without sources are harder to trust. Add at least one.</Note>}
      {sources.map((s, i) => (
        <View key={s.id} style={styles.source}>
          <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
            [{i + 1}]
          </Text>
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={2}>
              {s.title}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {s.url}
            </Text>
          </View>
          <IconButton
            icon="trash-outline"
            label={`Remove source ${s.title}`}
            size={18}
            color={colors.danger}
            onPress={() => onChange(sources.filter((x) => x.id !== s.id))}
          />
        </View>
      ))}
      <View style={styles.sourceForm}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Source title, e.g. WHO: Lead in drinking water"
          placeholderTextColor={colors.textSubtle}
          maxLength={200}
          style={styles.input}
          accessibilityLabel="Source title"
        />
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          accessibilityLabel="Source link"
        />
        {error && (
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        )}
        <Button label="Add source" icon="add" variant="secondary" size="sm" onPress={add} />
      </View>
    </FieldGroup>
  );
}

/** Shows the story exactly as readers will see it. */
function StoryPreview({ visible, onClose, form }: { visible: boolean; onClose: () => void; form: DraftForm }) {
  const insets = useSafeAreaInsets();
  const ready = form.storyBlocks.filter((b) => b.type !== "image" || b.url);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.previewHead}>
          <View style={styles.previewBadge}>
            <Ionicons name="eye-outline" size={14} color={colors.primary} />
            <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
              PREVIEW
            </Text>
          </View>
          <IconButton icon="close" label="Close preview" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.huge, gap: spacing.md }}>
          <Text variant="overline">The story</Text>
          <Text variant="h1">{form.storyHeadline || form.title || "Your headline"}</Text>
          {!!form.storyIntro && (
            <Text variant="article" color={colors.textMuted}>
              {form.storyIntro}
            </Text>
          )}
          <StoryBlocks blocks={ready} sources={form.sources} />
          <Text variant="h3" style={{ marginTop: spacing.xl }}>
            Sources
          </Text>
          <Card padded={false}>
            <SourceList sources={form.sources} />
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  emptyBlocks: {
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryTint,
  },
  block: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, backgroundColor: colors.card, ...shadow.card },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: -4, marginRight: -6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    minHeight: 46,
  },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 4 },
  tool: {
    width: 38,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  addRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  source: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sourceForm: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  previewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
}));
