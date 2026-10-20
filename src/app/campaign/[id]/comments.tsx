import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActionSheetIOS, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import { engageApi } from "@/api/engage";
import { keys, useComments } from "@/api/queries";
import type { Comment, ReportReason } from "@/api/types";
import { Avatar, EmptyState, ErrorState, LoadingState, Text, useToast } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { timeAgo } from "@/lib/format";
import { colors, fonts, spacing, themed } from "@/theme";
import { showAlert } from "@/components/ui/alert-dialog";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Abusive or hateful" },
  { value: "misleading", label: "Misleading" },
  { value: "other", label: "Something else" },
];

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const { isSignedIn } = useAuth();
  const query = useComments(id);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const input = useRef<TextInput>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: keys.comments(id) });

  const post = useMutation({
    mutationFn: () => engageApi.postComment(id, { body: text.trim(), parentId: replyTo?.id }),
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      void refresh();
      void qc.invalidateQueries({ queryKey: ["campaign"] });
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't post your comment.", "error"),
  });

  const remove = useMutation({
    mutationFn: (commentId: string) => engageApi.deleteComment(commentId),
    onSuccess: () => {
      toast("Comment deleted");
      void refresh();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't delete the comment.", "error"),
  });

  const report = useMutation({
    mutationFn: ({ commentId, reason }: { commentId: string; reason: ReportReason }) => engageApi.reportComment(commentId, reason),
    onSuccess: (r) => {
      toast(r.hidden ? "Reported. The comment is now hidden." : "Thanks, the comment was reported.");
      if (r.hidden) void refresh();
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : "Couldn't report the comment.", "error"),
  });

  const openMenu = (c: Omit<Comment, "replies">) => {
    const pickReason = () => {
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: [...REASONS.map((r) => r.label), "Cancel"], cancelButtonIndex: REASONS.length, title: "Why are you reporting this?" },
          (i) => i < REASONS.length && report.mutate({ commentId: c.id, reason: REASONS[i]!.value }),
        );
      } else {
        showAlert("Report comment", "Why are you reporting this?", [
          ...REASONS.slice(0, 2).map((r) => ({ text: r.label, onPress: () => report.mutate({ commentId: c.id, reason: r.value }) })),
          { text: "Misleading / other", onPress: () => report.mutate({ commentId: c.id, reason: "misleading" }) },
        ]);
      }
    };
    const actions = [
      ...(c.canDelete
        ? [
            {
              text: "Delete",
              style: "destructive" as const,
              onPress: () =>
                showAlert("Delete this comment?", "This can't be undone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => remove.mutate(c.id) },
                ]),
            },
          ]
        : []),
      ...(isSignedIn && !c.canDelete ? [{ text: "Report", onPress: pickReason }] : []),
      { text: "Cancel", style: "cancel" as const },
    ];
    if (actions.length === 1) return router.push("/login");
    showAlert("Comment options", undefined, actions);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          renderItem={({ item }) => (
            <View style={styles.thread}>
              <CommentItem
                c={item}
                onMenu={() => openMenu(item)}
                onReply={
                  isSignedIn && !item.isDeleted
                    ? () => {
                        setReplyTo({ id: item.id, name: item.author?.name ?? "" });
                        input.current?.focus();
                      }
                    : undefined
                }
              />
              {item.replies.length > 0 && (
                <View style={styles.replies}>
                  {item.replies.map((r) => (
                    <CommentItem key={r.id} c={r} onMenu={() => openMenu(r)} small />
                  ))}
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<EmptyState compact icon="chatbubbles-outline" title="No comments yet" body="Start the conversation about this campaign." />}
        />
      )}

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {isSignedIn ? (
          <>
            <Text variant="caption" color={colors.textSubtle} style={styles.rules}>
              Be respectful and stick to the message and its sources. Comments reported by several people are hidden.
            </Text>
            {replyTo && (
              <View style={styles.replying}>
                <Text variant="caption" style={{ flex: 1 }}>
                  Replying to {replyTo.name}
                </Text>
                <Pressable accessibilityLabel="Cancel reply" onPress={() => setReplyTo(null)} hitSlop={10}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                ref={input}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
                placeholderTextColor={colors.textSubtle}
                multiline
                maxLength={1000}
                style={styles.input}
                accessibilityLabel="Comment"
                maxFontSizeMultiplier={1.4}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Post comment"
                disabled={!text.trim() || post.isPending}
                onPress={() => post.mutate()}
                style={[styles.send, (!text.trim() || post.isPending) && { opacity: 0.4 }]}
              >
                <Ionicons name="arrow-up" size={20} color={colors.textOnDark} />
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push("/login")} style={styles.loginPrompt}>
            <Text variant="title" color={colors.primary}>
              Log in to join the conversation
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function CommentItem({ c, onMenu, onReply, small }: { c: Omit<Comment, "replies">; onMenu: () => void; onReply?: () => void; small?: boolean }) {
  if (c.isDeleted) {
    return (
      <Text variant="bodySm" color={colors.textSubtle} style={{ fontStyle: "italic", paddingVertical: spacing.sm }}>
        This comment was deleted.
      </Text>
    );
  }
  return (
    <View style={styles.comment}>
      <Avatar name={c.author?.name ?? "?"} url={c.author?.avatarUrl} size={small ? 28 : 36} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.commentHead}>
          <Text variant="title" style={{ fontSize: 14 }}>
            {c.author?.name}
          </Text>
          {c.author?.isCreator && (
            <View style={styles.creatorTag}>
              <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold, fontSize: 10 }}>
                CREATOR
              </Text>
            </View>
          )}
          <Text variant="caption" color={colors.textSubtle}>
            {timeAgo(c.createdAt)}
          </Text>
        </View>
        <Text variant="body">{c.body}</Text>
        {onReply && (
          <Pressable accessibilityRole="button" onPress={onReply} hitSlop={8} style={{ alignSelf: "flex-start", marginTop: 2 }}>
            <Text variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
              Reply
            </Text>
          </Pressable>
        )}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Comment options" onPress={onMenu} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  list: { padding: spacing.xl, paddingBottom: spacing.huge },
  thread: { paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  replies: { marginLeft: 48, marginTop: spacing.sm, gap: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.primarySoft },
  comment: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  commentHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  creatorTag: { backgroundColor: colors.primarySoft, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.background },
  rules: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, fontSize: 12 },
  replying: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: 22, // pill, like the send button beside it
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  loginPrompt: { minHeight: 48, alignItems: "center", justifyContent: "center" },
}));
