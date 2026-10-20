import { api } from "./client";
import type {
  Analytics,
  CampaignCard,
  CampaignPatch,
  CampaignStatus,
  CampaignUpdate,
  Category,
  MyCampaignList,
  MyCampaignTab,
  OwnerCampaign,
  Page,
  PublicCampaign,
  Report,
} from "./types";

export type CampaignSort = "newest" | "most_funded" | "ending_soon" | "nearly_funded";

export type CampaignListQuery = {
  q?: string;
  category?: Category;
  status?: CampaignStatus;
  featured?: boolean;
  sort?: CampaignSort;
  limit?: number;
  offset?: number;
};

export const campaignsApi = {
  // Public
  list: (query: CampaignListQuery = {}) => api<Page<CampaignCard>>("/campaigns", { query }),
  get: (idOrSlug: string) => api<PublicCampaign>(`/campaigns/${encodeURIComponent(idOrSlug)}`),
  report: (idOrSlug: string) => api<Report>(`/campaigns/${encodeURIComponent(idOrSlug)}/report`),
  updates: (id: string) => api<{ items: CampaignUpdate[] }>(`/campaigns/${id}/updates`).then((r) => r.items),
  postUpdate: (id: string, body: { title: string; body: string }) =>
    api<CampaignUpdate>(`/campaigns/${id}/updates`, { method: "POST", body }),

  // Creator
  create: (creationMode: "manual" | "voice") =>
    api<OwnerCampaign>("/me/campaigns", { method: "POST", body: { creationMode } }),
  mine: (tab?: MyCampaignTab) => api<MyCampaignList>("/me/campaigns", { query: { tab } }),
  getMine: (id: string) => api<OwnerCampaign>(`/me/campaigns/${id}`),
  update: (id: string, body: CampaignPatch) => api<OwnerCampaign>(`/me/campaigns/${id}`, { method: "PATCH", body }),
  remove: (id: string) => api<void>(`/me/campaigns/${id}`, { method: "DELETE" }),
  submit: (id: string) => api<OwnerCampaign>(`/me/campaigns/${id}/submit`, { method: "POST" }),
  cancel: (id: string) => api<OwnerCampaign>(`/me/campaigns/${id}/cancel`, { method: "POST" }),
  analytics: (id: string) => api<Analytics>(`/me/campaigns/${id}/analytics`),
};
