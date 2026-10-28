// Carries out what Sam decided: open screens and campaigns, search, start drafts, fill the editor.
import type { QueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import type { SamAction } from "@/api/assistant";
import { authApi } from "@/api/auth";
import { engageApi } from "@/api/engage";
import { keys } from "@/api/queries";
import type { NotificationCategory, NotificationPreferences } from "@/api/types";
import type { ThemeMode } from "@/theme";
import { currentEditor, intakeActive, queueGuide, setIntake, startIntakeDraft } from "./bridge";

const SCREENS: Record<string, Href> = {
  home: "/",
  explore: "/explore",
  create: "/create",
  voice_create: "/create/voice",
  activity: "/activity",
  profile: "/profile",
  my_campaigns: "/my-campaigns",
  backed: "/backed",
  following: "/following",
  payments: "/payments",
  settings: "/settings",
  help: { pathname: "/info/[page]", params: { page: "help" } },
  ...Object.fromEntries(
    (["how-it-works", "faq", "contact", "about", "partners", "terms", "privacy", "guidelines"] as const).map((page) => [
      page.replace(/-/g, "_"),
      { pathname: "/info/[page]", params: { page } } as Href,
    ]),
  ),
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs the actions in order. `turnOff` switches Sam off; returns a note if something couldn't be done. */
const ALL_CATEGORIES: NotificationCategory[] = ["my_campaigns", "funding", "payments", "promotion", "updates"];

export async function runActions(
  actions: SamAction[],
  opts: { qc: QueryClient; turnOff: () => void; setTheme: (mode: ThemeMode) => void },
) {
  for (const a of actions) {
    switch (a.type) {
      case "navigate": {
        // Already creating a campaign: "create" would only throw the user out of the editor
        if (a.target === "create" && currentEditor()) break;
        const to = SCREENS[a.target ?? ""];
        if (to) router.navigate(to);
        break;
      }
      case "open_campaign":
        if (a.target) router.push({ pathname: "/campaign/[id]", params: { id: a.target } });
        break;
      case "back_campaign":
        if (a.target) router.push({ pathname: "/campaign/[id]/back", params: { id: a.target } });
        break;
      case "search":
        if (a.value) router.navigate({ pathname: "/explore", params: { q: a.value, cat: "", at: String(Date.now()) } });
        break;
      case "show_category":
        if (a.value) router.navigate({ pathname: "/explore", params: { cat: a.value, q: "", at: String(Date.now()) } });
        break;
      case "new_draft":
        queueGuide();
        router.push("/create/new");
        break;
      case "draft_from_idea":
        // The same flow as "Create with voice": the idea shows in its box and the draft is made in view
        if (a.value) {
          queueGuide(); // Sam carries on in the editor once the draft is written
          // The draft is written on the "Create with Sam" screen, with nothing else to tap meanwhile
          if (!intakeActive()) setIntake({ about: "", audience: "", why: "" });
          startIntakeDraft(a.value);
          router.navigate("/create/sam");
        }
        break;
      case "set_theme":
        if (a.value === "light" || a.value === "dark" || a.value === "system") opts.setTheme(a.value);
        break;
      case "follow_campaign":
      case "unfollow_campaign":
        if (a.target) {
          await (a.type === "follow_campaign" ? engageApi.follow(a.target) : engageApi.unfollow(a.target));
          for (const key of [["campaign"], keys.following, ["me"]]) void opts.qc.invalidateQueries({ queryKey: key });
        }
        break;
      case "set_notification": {
        // Same settings the switches in Settings use; their screen updates straight away
        const prefs = await authApi.notificationPreferences();
        const on = a.value === "on";
        const next: NotificationPreferences =
          a.field === "push"
            ? { ...prefs, push: on }
            : a.field === "all"
              ? { ...prefs, muted: on ? [] : ALL_CATEGORIES }
              : {
                  ...prefs,
                  muted: on
                    ? prefs.muted.filter((m) => m !== a.field)
                    : [...new Set([...prefs.muted, a.field as NotificationCategory])],
                };
        await authApi.saveNotificationPreferences(next);
        opts.qc.setQueryData(["notification-prefs"], next);
        break;
      }
      case "generate_image":
        if ((a.field === "cover" || a.field === "ad") && a.value) currentEditor()?.generateImage(a.field, a.value);
        break;
      case "fill_field":
        if (a.field && a.value !== null) currentEditor()?.fill(a.field, a.value);
        break;
      case "go_step":
        if (a.value) currentEditor()?.goToStep(Number(a.value));
        break;
      case "turn_off":
        opts.turnOff();
        break;
    }
    // Let a screen change settle before the next action (e.g. open a campaign, then back it)
    if (a.type !== "fill_field") await wait(250);
  }
}
