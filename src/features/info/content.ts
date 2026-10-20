// Secondary destinations from the brief (Partners, About, How It Works, FAQs, Help, Contact, Terms,
// Privacy, Community Guidelines). Wording matches the platform's actual rules in the backend config:
// 20% fee inside the amount, ~2.9% processing on top, keep-what-you-raise, no refunds once paid,
// budget spent in full, simulated review, payments and delivery.

export const SUPPORT_EMAIL = "anuragshirvatkar1@gmail.com";

export type InfoPage = {
  page: string;
  title: string;
  intro: string;
  /** `email` turns the section into a tappable mail link */
  sections: { heading: string; body: string; email?: string }[];
};

export const PAGES: InfoPage[] = [
  {
    page: "how-it-works",
    title: "How it works",
    intro:
      "Campaigns helps important messages reach people beyond their creators' own networks. Creators prepare the message, the platform reviews it, and backers pool contributions that pay for its distribution.",
    sections: [
      {
        heading: "1. Create",
        body: "A creator (an individual, creator, nonprofit, organization, business or community group) writes the message as a short story, backs its claims with sources, adds visuals and an ad, chooses the intended audience and channels, and sets a funding goal and duration (14, 30, 45 or 60 days).",
      },
      {
        heading: "2. Review",
        body: "Before anything is published, the platform checks the story, the sources behind its claims, the visuals, the ad and the targeting. Approved campaigns open for funding. If a live campaign is edited, it goes back through review before its ads change.",
      },
      {
        heading: "3. Back",
        body: "Backers choose an amount, see the fees, the total and the estimated reach before paying, and get a receipt. They follow the campaign automatically and are notified about milestones (25%, 50%, 75%, 100%), updates and the final report.",
      },
      {
        heading: "4. Distribute",
        body: "When funding closes, the platform sets up the ads and runs them on the chosen placements until the advertising budget is spent. Campaigns keep what they raise, so a campaign that misses its goal is still promoted with what it raised.",
      },
      {
        heading: "5. Report",
        body: "A distribution report shows funds raised, the platform fee, the ad budget and how much of it was spent, impressions, clicks, and measured reach next to the reach estimated before launch.",
      },
      {
        heading: "Where the money goes",
        body: "80% of every contribution becomes the campaign's advertising budget; 20% is the platform fee for review, ad setup, delivery and reporting. Card processing (about 2.9%) is added on top at checkout. The advertising budget is spent by the platform on the campaign's ads and is never paid out to the creator.",
      },
      {
        heading: "Not a donation",
        body: "Your contribution pays for the distribution of a message — ads that show it to more people. It is not direct charitable support for the cause, person or organization in the campaign.",
      },
      {
        heading: "Estimated reach",
        body: "Reach before launch is an illustrative estimate from the prototype's configured assumptions (ad cost per 1,000 impressions and how often one person sees an ad). It is always shown as a range and is never a guarantee. After launch, measured delivery is reported separately.",
      },
    ],
  },
  {
    page: "faq",
    title: "FAQs",
    intro: "Quick answers to the questions people ask most.",
    sections: [
      {
        heading: "Is this a donation?",
        body: "No. Your contribution funds the distribution of a message — the ads that show it to more people. The creator or cause does not receive your money, and it is not tax-deductible.",
      },
      {
        heading: "What fees are there?",
        body: "A 20% platform fee is taken from inside each contribution (for $25: $20 goes to ads, $5 to the platform). Card processing of about 2.9% is added on top, and the checkout shows the exact total before you pay.",
      },
      {
        heading: "What happens to unspent money?",
        body: "The advertising budget is spent in full on delivering the message. It is never returned to the creator.",
      },
      {
        heading: "What if the goal isn't reached?",
        body: "Campaigns keep what they raise. Whatever was raised by the deadline is still used to promote the message.",
      },
      {
        heading: "Can I get a refund?",
        body: "A successful contribution is committed to promotion and can't be refunded. Declined, failed or cancelled payments are never charged.",
      },
      {
        heading: "Is my name shown?",
        body: 'Not by default. Backers are private unless they choose to be listed at checkout, and then only a short form like "Priya S." is shown. Payment records stay accurate either way.',
      },
      {
        heading: "Do I need an account?",
        body: "Not to browse — every campaign, its sources and its report are public. You need an account to back, follow, comment or create, so your receipts and notifications have somewhere to live. We only ask for your name, email and a password.",
      },
      {
        heading: "How does review work, and how long does it take?",
        body: "The platform checks the story, sources, visuals, ad and targeting. Approval means the campaign meets the content and advertising rules; it is not an independent fact-check or endorsement, and no trust score is calculated. In this prototype, review is simulated and completes about 20 seconds after submitting.",
      },
      {
        heading: "How long do campaigns run?",
        body: "Creators choose 14, 30, 45 or 60 days of funding. Ads run after funding closes, until the advertising budget is spent.",
      },
      {
        heading: "How is estimated reach calculated?",
        body: "From the prototype's demo assumptions: the share of each dollar that becomes ad spend, the average cost per 1,000 impressions, and how often one person sees an ad. It's shown as a range and is not a guarantee.",
      },
      {
        heading: "Can I promote a political candidate?",
        body: "No. Campaigns can't be used for election ads or to raise money for candidates, parties or committees.",
      },
      {
        heading: "Are the payments and ads real?",
        body: "Not in this prototype. Checkout is a clearly labelled simulation with a demo card, ad delivery is simulated, and sample campaigns are marked as demo data.",
      },
    ],
  },
  {
    page: "about",
    title: "About",
    intro: "Campaigns is a community-funded advertising platform for messages that deserve a wider audience.",
    sections: [
      {
        heading: "Why it exists",
        body: "Good information often stays inside the circle of people who already agree with it. Paid distribution can carry it further, but it's expensive for one person. Pooling small contributions makes it possible.",
      },
      {
        heading: "Who it's for",
        body: "Audiences discover campaigns, read their stories, check their sources and give feedback. Creators — individuals, nonprofits, organizations, businesses and community groups — prepare messages. Backers fund their reach. One account can do all three.",
      },
      {
        heading: "What the platform does",
        body: "Reviews every campaign before it's published, sets up and buys the advertising, manages each campaign through funding and distribution, and reports what was delivered.",
      },
      {
        heading: "This prototype",
        body: "This app is a hackathon prototype. Review, payments and ad delivery are simulated so the full journey can be shown end to end, and figures marked as demo data are illustrative.",
      },
    ],
  },
  {
    page: "partners",
    title: "Partners",
    intro: "Distribution partners are the advertising platforms that carry approved campaigns.",
    sections: [
      {
        heading: "Placements",
        body: "Campaigns run on Facebook and Instagram placements. The creator chooses the channels and how the budget is split between them; the platform finalises placements, bids and schedule during review.",
      },
      {
        heading: "How ads appear",
        body: "Ads are labelled as sponsored, link back to the campaign page, and only run after the campaign is approved and funded.",
      },
      {
        heading: "In this prototype",
        body: "No real ads are bought. Delivery numbers in reports come from a simulated ad platform and are labelled as such.",
      },
    ],
  },
  {
    page: "help",
    title: "Help",
    intro: "Stuck somewhere? Start here.",
    sections: [
      {
        heading: "Where are my drafts?",
        body: "Drafts save automatically as you type. Find them in Create → Your drafts, or Profile → Created campaigns. An empty draft is removed when you leave it.",
      },
      {
        heading: "My campaign is in review",
        body: "In this demo, review completes automatically about 20 seconds after you submit. You'll get a notification when it goes live.",
      },
      {
        heading: "I want to change a live campaign",
        body: "You can edit until funding closes. Saving changes sends it back to review before the ads are updated; the deadline stays the same.",
      },
      {
        heading: "My payment failed",
        body: "You weren't charged. Try again with your saved card. This prototype only accepts its demo card, so any other number is declined.",
      },
      {
        heading: "Where are my receipts?",
        body: "Profile → Payment history lists every attempt, including declined and cancelled ones. Tap one to see its receipt. Payment notifications open the receipt too.",
      },
      {
        heading: "Notifications",
        body: "You're notified about campaigns you back or follow: funding milestones, deadlines, creator updates, ads starting and the final report. Unfollow a campaign to stop its notifications.",
      },
    ],
  },
  {
    page: "contact",
    title: "Contact",
    intro: "We'd love to hear from you.",
    sections: [
      {
        heading: "Support",
        body: "Email us with your account email and, if it's about a campaign, its title.",
        email: SUPPORT_EMAIL,
      },
      {
        heading: "Report a problem with a campaign",
        body: "Report a comment from its menu in the comments section, or email us about a campaign's content. The platform reviews every report.",
      },
    ],
  },
  {
    page: "terms",
    title: "Terms",
    intro: "The short version of the rules for using Campaigns.",
    sections: [
      {
        heading: "Contributions",
        body: "Contributions fund advertising for a campaign's message. They are not charitable donations, political donations, purchases, investments or payments to the creator.",
      },
      {
        heading: "Fees and refunds",
        body: "A 20% platform fee is included in each contribution and card processing is added at checkout. A successful contribution is committed to promotion and is not refundable; failed, declined or cancelled payments are never charged.",
      },
      {
        heading: "Allocation of funds",
        body: "The advertising budget is spent by the platform on the campaign's chosen placements, in full. Campaigns keep what they raise, even if the goal isn't reached.",
      },
      {
        heading: "Creators",
        body: "Creators are responsible for the accuracy of their campaigns and must provide sources for factual claims. Election ads and fundraising for candidates or parties are not allowed.",
      },
      {
        heading: "Review and moderation",
        body: "Every campaign is reviewed before publishing and again after material edits. The platform may decline, pause or cancel campaigns, and hide comments, that break these rules.",
      },
      {
        heading: "Distribution",
        body: "Estimated reach is never guaranteed. Actual reach depends on advertising inventory, prices, targeting, delivery and performance.",
      },
    ],
  },
  {
    page: "privacy",
    title: "Privacy",
    intro: "What we collect and why.",
    sections: [
      {
        heading: "Account",
        body: "Your name, email and password (stored hashed) so you can sign in. Nothing else is required.",
      },
      {
        heading: "Backer privacy",
        body: 'Backers are private by default. If you choose to be listed, only a short form of your name like "Priya S." is shown — never your email or amount details beyond the campaign\'s public totals.',
      },
      {
        heading: "Payments",
        body: "We keep an accurate record of each contribution for your receipts and the campaign's reports. In this prototype no card details are stored — checkout is simulated.",
      },
      {
        heading: "Advertising",
        body: "Campaign ads target broad audience characteristics chosen by the creator, such as location, age range and interests. We don't use your activity in this app to target ads, and backers' names are never used in ads.",
      },
      {
        heading: "Notifications",
        body: "If you allow push notifications, we store a device token to send them. It's removed when you log out.",
      },
      {
        heading: "Your data",
        body: "To get a copy of your data or delete your account, email us.",
        email: SUPPORT_EMAIL,
      },
    ],
  },
  {
    page: "guidelines",
    title: "Community guidelines",
    intro: "Keep campaigns and conversations useful and respectful.",
    sections: [
      {
        heading: "Campaigns",
        body: "Back factual claims with sources, don't impersonate people or organizations, and don't run election ads or raise money for candidates or parties.",
      },
      {
        heading: "Comments",
        body: "Discuss the message and its sources. Personal attacks, harassment and hate are not allowed.",
      },
      { heading: "No spam or misleading content", body: "Don't post ads, scams or claims you know to be false." },
      {
        heading: "Reporting",
        body: "Report comments that break these rules. A comment is hidden automatically once several people report it, and the campaign's creator can remove comments on their campaign.",
      },
    ],
  },
];

export const INFO_LINKS = PAGES.map(({ page, title }) => ({ page, title }));

/** Profile groups the pages into three rows; a group with several pages opens as one combined page. */
export const INFO_GROUPS: { key: string; title: string; intro: string; pages: string[] }[] = [
  { key: "how-it-works", title: "How it works", intro: "", pages: ["how-it-works"] },
  {
    key: "help-faq",
    title: "Help & FAQ",
    intro: "Answers to common questions, help with your account and campaigns, and how to reach us.",
    pages: ["faq", "help", "contact"],
  },
  {
    key: "about-legal",
    title: "About & legal",
    intro: "Who we are, who we work with, and the rules for using the platform.",
    pages: ["about", "partners", "terms", "privacy", "guidelines"],
  },
];
