const ELIGIBLE_PREFIX = "social_links_nudge_eligible:";
const DISMISSED_PREFIX = "social_links_nudge_dismissed:";

function eligibleKey(brokerId: string) {
  return `${ELIGIBLE_PREFIX}${brokerId}`;
}

function dismissedKey(brokerId: string) {
  return `${DISMISSED_PREFIX}${brokerId}`;
}

/** Call after post-payment branding setup so the dashboard can show a one-time nudge. */
export function markSocialLinksNudgeEligible(brokerId: string) {
  if (!brokerId) return;
  try {
    localStorage.setItem(eligibleKey(brokerId), "true");
  } catch {
    // ignore quota / private mode
  }
}

export function dismissSocialLinksNudge(brokerId: string) {
  if (!brokerId) return;
  try {
    localStorage.setItem(dismissedKey(brokerId), "true");
    localStorage.removeItem(eligibleKey(brokerId));
  } catch {
    // ignore
  }
}

export function shouldShowSocialLinksNudge(
  brokerId: string | undefined | null,
): boolean {
  if (!brokerId) return false;
  try {
    if (localStorage.getItem(dismissedKey(brokerId)) === "true") return false;
    return localStorage.getItem(eligibleKey(brokerId)) === "true";
  } catch {
    return false;
  }
}
