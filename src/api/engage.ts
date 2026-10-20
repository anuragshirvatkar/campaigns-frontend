// Follows, feedback, comments and notifications: everything a signed-in reader does around a campaign.
import { api } from "./client";
import type { Comment, FeedbackAnswer, FollowedCampaign, Notification, Page, ReportReason } from "./types";

export const engageApi = {
  follow: (campaignId: string) => api<void>(`/campaigns/${campaignId}/follow`, { method: "PUT" }),
  unfollow: (campaignId: string) => api<void>(`/campaigns/${campaignId}/follow`, { method: "DELETE" }),
  following: () => api<{ items: FollowedCampaign[] }>("/me/follows").then((r) => r.items),

  feedback: (campaignId: string, body: { visualsAnswer?: FeedbackAnswer; changedMindAnswer?: FeedbackAnswer }) =>
    api<{ visualsAnswer: FeedbackAnswer | null; changedMindAnswer: FeedbackAnswer | null }>(
      `/campaigns/${campaignId}/feedback`,
      { method: "PUT", body },
    ),

  comments: (campaignId: string) => api<{ items: Comment[] }>(`/campaigns/${campaignId}/comments`).then((r) => r.items),
  postComment: (campaignId: string, body: { body: string; parentId?: string }) =>
    api<Comment>(`/campaigns/${campaignId}/comments`, { method: "POST", body }),
  deleteComment: (id: string) => api<void>(`/comments/${id}`, { method: "DELETE" }),
  reportComment: (id: string, reason: ReportReason) =>
    api<{ reported: boolean; hidden: boolean }>(`/comments/${id}/report`, { method: "POST", body: { reason } }),

  notifications: (offset = 0) => api<Page<Notification>>("/me/notifications", { query: { limit: 30, offset } }),
  unreadCount: () => api<{ count: number }>("/me/notifications/unread-count"),
  markRead: (id: string) => api<void>(`/me/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => api<void>("/me/notifications/read-all", { method: "POST" }),
  savePushToken: (token: string) => api<void>("/me/notifications/push-token", { method: "POST", body: { token } }),
  removePushToken: (token: string) => api<void>("/me/notifications/push-token", { method: "DELETE", body: { token } }),
};
