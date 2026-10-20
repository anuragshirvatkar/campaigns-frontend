import { router, type Href } from "expo-router";

/** Go back if there's somewhere to go; otherwise (opened from a link or notification) go to a sensible screen. */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
