// Response shapes from the backend (see campaign-one-backend/README.md and the module mappers).

export type User = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  /** "admin" = the platform admin, who reviews campaigns */
  role: UserRole;
  /** Sam's first-run tour is done (never shown again, even after logging back in) */
  appIntroduced: boolean;
  /** Sam, the voice assistant, is switched on */
  assistantEnabled: boolean;
  createdAt: string;
};

export type UserRole = "user" | "admin";

export type Me = User & { counts: { createdCount: number; backedCount: number; followingCount: number } };

export type AuthResponse = { token: string; user: User };

/** Every backend error: { error: { code, message, details? } } */
export type ApiErrorBody = { error: { code: string; message: string; details?: unknown } };

export type Page<T> = { items: T[]; nextOffset: number | null };

// ─── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "funding"
  | "funded"
  | "funding_ended"
  | "distribution_prep"
  | "promoting"
  | "completed"
  | "cancelled";

export type Category =
  | "environment"
  | "health"
  | "science"
  | "education"
  | "public_policy"
  | "economic_policy"
  | "community"
  | "arts_culture"
  | "business"
  | "other";

export type CreatorType = "individual" | "influencer" | "nonprofit" | "organization" | "business" | "community_group";

export type Channel = "facebook" | "instagram";

export type ReachEstimate = { low: number; mid: number; high: number };

export type Funding = {
  raisedCents: number;
  goalCents: number | null;
  percentFunded: number;
  backerCount: number;
  deadline: string | null;
  estimatedReachAtGoal: ReachEstimate | null;
  reachPerDollar: number;
};

export type CampaignCard = {
  id: string;
  slug: string | null;
  status: CampaignStatus;
  title: string | null;
  category: Category | null;
  creatorName: string | null;
  creatorType: CreatorType | null;
  summary: string | null;
  coverImageUrl: string | null;
  /** Square ad image when the campaign has one; better for square/portrait thumbnails */
  squareImageUrl: string | null;
  isFeatured: boolean;
  isDemo: boolean;
  publishedAt: string | null;
  funding: Funding;
};

export type StoryBlock =
  | { type: "heading"; id?: string; text: string }
  | { type: "paragraph"; id?: string; text: string }
  | { type: "image"; id?: string; url: string; caption?: string; credit?: string }
  | { type: "stat"; id?: string; value: string; label: string; sourceId?: string }
  | { type: "action"; id?: string; label: string; url?: string };

export type Source = { id: string; title: string; url: string };

export type AdAsset = {
  id: string;
  type: "image" | "video";
  url: string;
  width?: number;
  height?: number;
  durationSec?: number;
  /** Created with the AI image tool */
  aiGenerated?: boolean;
};

export type Reach = {
  locations: string[];
  ageMin?: number | null;
  ageMax?: number | null;
  interests: string[];
  channels: Channel[];
  budgetSplit: Partial<Record<Channel, number>>;
};

export type TimelineStep = { key: CampaignStatus; label: string; at: string | null; isCurrent: boolean };

export type CampaignDetail = CampaignCard & {
  creatorDescription: string | null;
  targetAudience: string | null;
  whyItMatters: string | null;
  story: { headline: string | null; intro: string | null; blocks: StoryBlock[] };
  sources: Source[];
  ad: { headline: string | null; description: string | null; ctaText: string | null; assets: AdAsset[] };
  reach: Partial<Reach>;
  durationDays: number | null;
  submittedAt: string | null;
  timeline: TimelineStep[];
  useOfFunds: { platformFeePct: number; adSharePct: number; processingFeePct: number; adBudgetCents: number };
};

export type PublicCampaign = CampaignDetail & {
  publicBackers: { name: string; amountCents: number; paidAt: string | null }[];
  counts: { followers: number; updates: number; comments: number };
  viewer: {
    isFollowing: boolean;
    hasBacked: boolean;
    isOwner: boolean;
    feedback: { visualsAnswer: FeedbackAnswer | null; changedMindAnswer: FeedbackAnswer | null } | null;
  } | null;
};

export type ReadinessIssue = { field: string; step: number; message: string };

export type OwnerCampaign = CampaignDetail & {
  currentStep: number;
  creationMode: "manual" | "voice";
  adHeadline: string | null;
  fundingGoalCents: number | null;
  rulesAccepted: boolean;
  isEditable: boolean;
  editRequiresReview: boolean;
  createdAt: string;
  updatedAt: string;
  readiness: { issues: ReadinessIssue[]; warnings: ReadinessIssue[]; canSubmit: boolean };
  /** Latest moderation decision (an audit record is kept for every review) */
  review: CampaignReview | null;
};

export type CampaignReview = {
  decision: "approved" | "changes_requested" | "rejected";
  summary: string;
  issues: ReadinessIssue[];
  /** "ai" = automated content review, "rules" = built-in checks */
  reviewer: string;
  at: string;
};

export type NotificationCategory = "my_campaigns" | "funding" | "payments" | "promotion" | "updates";
export type NotificationPreferences = { push: boolean; muted: NotificationCategory[] };

export type MyCampaignCard = CampaignCard & { currentStep: number; updatedAt: string; requiresAction: boolean };

export type MyCampaignTab = "drafts" | "under_review" | "funding" | "promoting" | "completed" | "requires_action";

export type MyCampaignList = { items: MyCampaignCard[]; counts: Record<MyCampaignTab, number> };

/** Fields the creation flow can autosave (all optional; see updateCampaignBody on the server). */
export type CampaignPatch = Partial<{
  currentStep: number;
  creationMode: "manual" | "voice";
  title: string | null;
  category: Category | null;
  creatorName: string | null;
  creatorType: CreatorType | null;
  creatorDescription: string | null;
  summary: string | null;
  coverImageUrl: string | null;
  targetAudience: string | null;
  whyItMatters: string | null;
  storyHeadline: string | null;
  storyIntro: string | null;
  storyBlocks: StoryBlock[];
  sources: Source[];
  adHeadline: string | null;
  adDescription: string | null;
  ctaText: string | null;
  adAssets: AdAsset[];
  reach: Reach;
  durationDays: number;
  fundingGoalCents: number | null;
  rulesAccepted: boolean;
}>;

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ChannelMetrics = { channel: Channel; adSpendCents: number; impressions: number; clicks: number; reach: number };

export type Report = {
  campaign: { id: string; slug: string | null; title: string | null; status: CampaignStatus };
  isSimulated: boolean;
  isFinal: boolean;
  hasDelivery: boolean;
  promotingAt: string | null;
  completedAt: string | null;
  funds: {
    raisedCents: number;
    backerCount: number;
    platformFeeCents: number;
    adBudgetCents: number;
    adSpentCents: number;
  };
  measured: { impressions: number; clicks: number; reach: number; clickThroughRatePct: number };
  estimate: { reachForRaised: ReachEstimate; note: string };
  byChannel: ChannelMetrics[];
  series: { at: string; adSpendCents: number; impressions: number; reach: number; clicks: number }[];
};

export type FeedbackTally = { no: number; somewhat: number; yes: number; total: number };

export type Analytics = Report & {
  funding: {
    raisedCents: number;
    goalCents: number | null;
    percentFunded: number;
    contributionCount: number;
    backerCount: number;
    followerCount: number;
    milestonesReached: number[];
    fundingOverTime: { day: string; raisedCents: number; contributions: number; cumulativeCents: number }[];
    summary: string;
  };
  duration: {
    days: number | null;
    publishedAt: string | null;
    deadline: string | null;
    promotingAt: string | null;
    completedAt: string | null;
  };
  feedback: { visuals: FeedbackTally; changedMind: FeedbackTally };
};

// ─── Contributions ────────────────────────────────────────────────────────────

export type ContributionStatus = "pending" | "succeeded" | "failed" | "rejected" | "cancelled";

export type Contribution = {
  id: string;
  /** Made without an account */
  isGuest?: boolean;
  receiptNumber: string;
  status: ContributionStatus;
  failureReason: string | null;
  campaign: { id: string; slug: string | null; title: string | null; coverImageUrl: string | null };
  breakdown: {
    contributionCents: number;
    platformFeeCents: number;
    adSpendCents: number;
    processingFeeCents: number;
    totalChargedCents: number;
  };
  estimatedReach: ReachEstimate;
  isPublic: boolean;
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
  isSimulated: boolean;
};

export type ContributionWithFunding = Contribution & { campaignFunding: Funding };

export type BackedCampaign = CampaignCard & { myContributionCents: number; lastBackedAt: string | null };

export type FollowedCampaign = CampaignCard & { followedAt: string };

// ─── Engagement ───────────────────────────────────────────────────────────────

export type FeedbackAnswer = "no" | "somewhat" | "yes";

export type ReportReason = "spam" | "abusive" | "misleading" | "other";

export type Comment = {
  id: string;
  parentId: string | null;
  author: { name: string; avatarUrl: string | null; isCreator: boolean } | null;
  body: string | null;
  isDeleted: boolean;
  createdAt: string;
  canDelete: boolean;
  replies: Omit<Comment, "replies">[];
};

export type CampaignUpdate = { id: string; title: string; body: string; createdAt: string };

export type NotificationType =
  | "submission_received"
  | "campaign_approved"
  | "campaign_changes_requested"
  | "campaign_rejected"
  | "campaign_live"
  | "funding_milestone"
  | "deadline_approaching"
  | "funding_ended"
  | "contribution_succeeded"
  | "contribution_failed"
  | "promotion_started"
  | "distribution_progress"
  | "campaign_completed"
  | "report_available"
  | "campaign_update"
  | "new_comment"
  | "security_alert";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  /** Set on payment notifications: the contribution whose receipt they open */
  contributionId?: string | null;
  campaign: { id: string; slug: string | null; title: string | null; coverImageUrl: string | null; squareImageUrl?: string | null } | null;
};

// ─── Platform ─────────────────────────────────────────────────────────────────

export type PlatformConfig = {
  currency: string;
  fees: { platformFeePct: number; processingFeePct: number };
  reach: {
    reachPerDollar: number;
    deployRate: number;
    frequency: number;
    ctr: number;
    cpmDefaultCents: number;
    estimateRangePct: number;
    disclaimer: string;
  };
  funding: {
    minGoalCents: number;
    maxGoalCents: number;
    minContributionCents: number;
    maxContributionCents: number;
    presetAmountsCents: number[];
    durationDays: number[];
    milestonesPct: number[];
    deadlineReminderHours: number;
  };
  channels: Channel[];
  categories: { value: Category; label: string }[];
  creatorTypes: { value: CreatorType; label: string }[];
  voicePrompts: string[];
  demo: {
    paymentsSimulated: boolean;
    testCards: { number: string; outcome: string; description: string }[];
    reviewIsAutomatic: boolean;
    aiMode: "ai" | "demo";
  };
};

export type Upload = {
  url: string;
  type: "image" | "video";
  width: number;
  height: number;
  bytes: number;
  durationSec: number | null;
  aiGenerated?: boolean;
};

export type AiDraft = {
  title: string;
  category: Category;
  creatorType: CreatorType | null;
  creatorDescription: string | null;
  summary: string;
  targetAudience: string;
  whyItMatters: string;
  storyHeadline: string;
  storyIntro: string;
  storyBlocks: { type: "heading" | "paragraph"; text: string }[];
  adHeadline: string;
  adDescription: string;
  ctaText: string;
  followUpQuestions: string[];
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminTab = "pending" | "changes_requested" | "approved" | "rejected";

export type AdminCreator = { id: string; fullName: string; email: string; avatarUrl: string | null; createdAt: string };

/** The automated pre-screen of the latest submission: a suggestion for the admin, never shown to the creator. */
export type AiSuggestion = CampaignReview;

export type AdminCampaignCard = CampaignCard & {
  creator: AdminCreator;
  submittedAt: string | null;
  reviewedAt: string | null;
  isResubmission: boolean;
  aiSuggestion: AiSuggestion | null;
};

export type AdminCampaignList = { items: AdminCampaignCard[]; counts: Record<AdminTab, number> };

export type AdminCampaign = CampaignDetail & {
  creator: AdminCreator & { campaignCount: number };
  reviewedAt: string | null;
  isResubmission: boolean;
  /** False once the campaign has been live: it can only be sent back for changes */
  canReject: boolean;
  counts: { followers: number; comments: number };
  aiSuggestion: AiSuggestion | null;
  reviews: CampaignReview[];
};

export type ReviewDecision = CampaignReview["decision"];
export type ReviewInput = { decision: ReviewDecision; note?: string; issues?: { step: number; message: string }[] };

/** Days back, or all time */
export type AnalyticsRange = "7" | "30" | "90" | "all";

export type AdminAnalytics = {
  /** null = all time */
  days: number | null;
  /** First day of the period (YYYY-MM-DD) */
  since: string;
  /** Chart points are days, or weeks for long periods */
  bucket: "day" | "week";
  kpis: {
    raisedCents: number;
    prevRaisedCents: number | null;
    contributions: number;
    prevContributions: number | null;
    backers: number;
    avgContributionCents: number;
    platformFeeCents: number;
    newUsers: number;
    prevNewUsers: number | null;
  };
  allTime: { raisedCents: number; users: number; campaigns: number; live: number; promoting: number; completed: number; drafts: number };
  review: {
    pending: number;
    changesRequested: number;
    rejected: number;
    decisions: { approved: number; changesRequested: number; rejected: number };
    approvalRatePct: number | null;
    avgReviewHours: number | null;
    /** How often the admin's decision matched the AI suggestion (missing from older servers) */
    aiAgreement?: { decisions: number; agreedPct: number | null };
  };
  statuses: { status: CampaignStatus; count: number }[];
  daily: { date: string; raisedCents: number; contributions: number; signups: number; submissions: number }[];
  categories: { category: Category; campaigns: number; raised: number }[];
  payments: { succeeded: number; failed: number; cancelled: number; pending: number; successRatePct: number | null };
  delivery: {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    ctrPct: number;
    channels: { channel: Channel; spend: number; impressions: number; clicks: number; reach: number }[];
  };
  funnel: { key: string; label: string; count: number }[];
  engagement: { follows: number; comments: number; feedback: { yes: number; somewhat: number; no: number } };
  topCampaigns: {
    id: string;
    title: string | null;
    status: CampaignStatus;
    category: Category | null;
    imageUrl: string | null;
    raisedCents: number;
    goalCents: number | null;
    backers: number;
  }[];
};
