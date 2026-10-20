import { Share } from "react-native";

/** Opens the system share sheet. Links use the app scheme until a public web domain exists. */
export async function shareCampaign(c: { title: string | null; slug: string | null; id: string; summary?: string | null }) {
  const link = `campaignone://campaign/${c.slug ?? c.id}`;
  try {
    await Share.share({
      title: c.title ?? "Campaign",
      message: `${c.title ?? "A campaign"} — help this message reach more people on Campaigns.\n${link}`,
    });
  } catch {
    // Dismissed or unavailable: nothing to do
  }
}
