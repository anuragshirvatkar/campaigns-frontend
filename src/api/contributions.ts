import { guestReceipts } from "@/lib/guest-receipts";
import { api } from "./client";
import type { BackedCampaign, Contribution, ContributionWithFunding, Page } from "./types";

/** A guest payment is only shown to the device holding its receipt key (signed-in payments need none). */
const guestHeaders = (id: string) => {
  const token = guestReceipts.tokenFor(id);
  return token ? { "X-Guest-Token": token } : undefined;
};

export const contributionsApi = {
  create: async (body: { campaignId: string; amountCents: number; isPublic: boolean; idempotencyKey: string; guestEmail?: string }) => {
    const c = await api<Contribution & { guestToken?: string | null }>("/contributions", { method: "POST", body });
    if (c.guestToken) guestReceipts.save(c.id, c.guestToken);
    return c;
  },
  confirm: (id: string, cardNumber: string) =>
    api<ContributionWithFunding>(`/contributions/${id}/confirm`, { method: "POST", body: { cardNumber }, headers: guestHeaders(id) }),
  cancel: (id: string) => api<ContributionWithFunding>(`/contributions/${id}/cancel`, { method: "POST", headers: guestHeaders(id) }),
  get: (id: string) => api<ContributionWithFunding>(`/contributions/${id}`, { headers: guestHeaders(id) }),
  history: (offset = 0) => api<Page<Contribution>>("/me/contributions", { query: { limit: 20, offset } }),
  backed: () => api<{ items: BackedCampaign[] }>("/me/backed").then((r) => r.items),
};
