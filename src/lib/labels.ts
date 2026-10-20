// Human labels, icons and colours for backend enums, so every screen names things the same way.
import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { CampaignStatus, Category, ContributionStatus, CreatorType, Notification, NotificationType } from "@/api/types";
import { colors, themed } from "@/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export const CATEGORY: Record<Category, { label: string; icon: IconName; tint: string; bg: string }> = themed(() => ({
  environment: { label: "Environment", icon: "leaf-outline", tint: colors.success, bg: colors.successSoft },
  health: { label: "Health", icon: "medkit-outline", tint: colors.coral, bg: colors.coralSoft },
  science: { label: "Science", icon: "flask-outline", tint: colors.blue, bg: colors.blueSoft },
  education: { label: "Education", icon: "school-outline", tint: colors.primary, bg: colors.primarySoft },
  public_policy: { label: "Public Policy", icon: "business-outline", tint: colors.navy, bg: colors.surfaceAlt },
  economic_policy: { label: "Economic Policy", icon: "trending-up-outline", tint: colors.teal, bg: colors.tealSoft },
  community: { label: "Community", icon: "people-outline", tint: colors.amber, bg: colors.amberSoft },
  arts_culture: { label: "Arts & Culture", icon: "color-palette-outline", tint: colors.coral, bg: colors.coralSoft },
  business: { label: "Business", icon: "briefcase-outline", tint: colors.blue, bg: colors.blueSoft },
  other: { label: "Other", icon: "ellipsis-horizontal-circle-outline", tint: colors.textMuted, bg: colors.surface },
}));

export const CATEGORIES = Object.keys(CATEGORY) as Category[];

export const CREATOR_TYPE: Record<CreatorType, string> = {
  individual: "Individual",
  influencer: "Creator / influencer",
  nonprofit: "Nonprofit",
  organization: "Organization",
  business: "Business",
  community_group: "Community group",
};

type Tone = "primary" | "success" | "warning" | "danger" | "neutral" | "info";

export const STATUS: Record<CampaignStatus, { label: string; tone: Tone; explain: string }> = {
  draft: { label: "Draft", tone: "neutral", explain: "Only you can see this. Finish the steps and submit it for review." },
  submitted: { label: "In review", tone: "info", explain: "The platform is checking the content, sources and targeting." },
  changes_requested: {
    label: "Changes requested",
    tone: "warning",
    explain: "Review found a few things to fix. Make the changes and resubmit.",
  },
  rejected: { label: "Not approved", tone: "danger", explain: "This campaign doesn't meet the campaign rules, so it can't run." },
  approved: { label: "Approved", tone: "info", explain: "Approved. It goes live for funding in a moment." },
  funding: { label: "Funding", tone: "primary", explain: "Live. Backers are funding the reach of this message." },
  funded: { label: "Goal reached", tone: "success", explain: "Fully funded. The platform is preparing distribution." },
  funding_ended: {
    label: "Funding ended",
    tone: "warning",
    explain: "The funding period ended. What was raised is still used to promote the message.",
  },
  distribution_prep: {
    label: "Preparing ads",
    tone: "info",
    explain: "The platform is setting up the ads, placements and schedule.",
  },
  promoting: { label: "Promoting", tone: "success", explain: "Ads are running. Delivery numbers update as they come in." },
  completed: { label: "Completed", tone: "neutral", explain: "Promotion finished. The final report is available." },
  cancelled: { label: "Cancelled", tone: "danger", explain: "This campaign was cancelled before anyone backed it." },
};

export const TONE: Record<Tone, { fg: string; bg: string }> = themed(() => ({
  primary: { fg: colors.primary, bg: colors.primarySoft },
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  neutral: { fg: colors.textMuted, bg: colors.surface },
  info: { fg: colors.blue, bg: colors.blueSoft },
}));

export const NOTIFICATION_ICON: Record<NotificationType, { icon: IconName; tone: Tone }> = {
  submission_received: { icon: "paper-plane-outline", tone: "info" },
  campaign_approved: { icon: "checkmark-circle-outline", tone: "success" },
  campaign_changes_requested: { icon: "create-outline", tone: "warning" },
  campaign_rejected: { icon: "close-circle-outline", tone: "danger" },
  campaign_live: { icon: "rocket-outline", tone: "primary" },
  funding_milestone: { icon: "flag-outline", tone: "primary" },
  deadline_approaching: { icon: "time-outline", tone: "warning" },
  funding_ended: { icon: "hourglass-outline", tone: "neutral" },
  contribution_succeeded: { icon: "heart-outline", tone: "success" },
  contribution_failed: { icon: "alert-circle-outline", tone: "danger" },
  promotion_started: { icon: "megaphone-outline", tone: "primary" },
  distribution_progress: { icon: "trending-up-outline", tone: "info" },
  campaign_completed: { icon: "trophy-outline", tone: "success" },
  report_available: { icon: "bar-chart-outline", tone: "info" },
  campaign_update: { icon: "newspaper-outline", tone: "primary" },
  new_comment: { icon: "chatbubble-outline", tone: "primary" },
  security_alert: { icon: "shield-checkmark-outline", tone: "warning" },
};

/**
 * Headline for the Activity feed. Stored titles name the campaign (they double as push titles),
 * but the feed row already shows its image and name, so the event alone is enough here.
 */
export function feedHeadline(n: Notification): string {
  const t = n.title;
  const changes = t.startsWith("Your changes");
  switch (n.type) {
    case "submission_received":
      return changes ? "Your changes are under review" : "Submitted for review";
    case "campaign_approved":
      return changes ? "Your changes are approved" : "Approved and live";
    case "campaign_changes_requested":
      return "Changes requested";
    case "campaign_rejected":
      return "Not approved";
    case "campaign_live":
      return "Open for backing";
    case "funding_milestone":
      return t.match(/(\d+)% funded/)?.[0].replace(/^./, (c) => c.toUpperCase()) ?? "Fully funded";
    case "deadline_approaching":
      return t.includes(" left for ") ? `${t.split(" left for ")[0]} left` : t;
    case "funding_ended":
      return "Funding has closed";
    case "promotion_started":
      return "Ads are now running";
    case "distribution_progress": {
      const people = t.match(/about ([\d,]+) people/)?.[1];
      return people ? `Reached about ${people} people` : t;
    }
    case "campaign_completed":
      return "Promotion finished";
    case "report_available":
      return "Final report is ready";
    case "contribution_succeeded":
      return "Thanks for backing";
    case "new_comment":
      return "New comment";
    default:
      return t;
  }
}

export const CHANNEL: Record<string, { label: string; icon: IconName; color: string }> = themed(() => ({
  facebook: { label: "Facebook", icon: "logo-facebook", color: colors.blue },
  instagram: { label: "Instagram", icon: "logo-instagram", color: colors.coral },
}));

export const PAYMENT_STATUS: Record<ContributionStatus, { label: string; tone: Tone }> = {
  succeeded: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  rejected: { label: "Declined", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

