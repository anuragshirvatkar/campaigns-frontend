import { api } from "./client";
import type { AdminAnalytics, AnalyticsRange, AdminCampaign, AdminCampaignList, AdminTab, ReviewInput } from "./types";

export const adminApi = {
  campaigns: (tab: AdminTab) => api<AdminCampaignList>("/admin/campaigns", { query: { tab } }),
  campaign: (id: string) => api<AdminCampaign>(`/admin/campaigns/${id}`),
  review: (id: string, body: ReviewInput) => api<AdminCampaign>(`/admin/campaigns/${id}/review`, { method: "POST", body }),
  analytics: (days: AnalyticsRange) => api<AdminAnalytics>("/admin/analytics", { query: { days } }),
};
