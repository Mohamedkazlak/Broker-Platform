/**
 * Client-side plan-change draft.
 *
 * An existing broker who upgrades or downgrades walks the same three screens as
 * a new signup (plan → domain → payment), but nothing may touch their account
 * on the way: they keep the plan they paid for until the new one is paid for
 * and — for Instapay — approved by an admin. So the chosen plan and domain ride
 * along here instead of being written to the broker row, and every server call
 * re-validates and re-prices them (see server/services/subscription.js).
 *
 * Mirrors the onboarding draft's storage strategy, including the age cutoff so
 * an abandoned upgrade doesn't resurface days later.
 */

import type { OnboardingDomainChoice } from "./onboardingDraft";
import type { PackageCategory, PlanId } from "./plans";

const DRAFT_KEY = "plan_change_draft";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PlanChangeDraft {
  package: PlanId;
  packageCategory?: PackageCategory;
  domain?: OnboardingDomainChoice;
  /** Epoch ms of the last write, used to expire abandoned drafts. */
  savedAt?: number;
}

export function savePlanChangeDraft(draft: PlanChangeDraft): void {
  const serialized = JSON.stringify({ ...draft, savedAt: Date.now() });
  try {
    localStorage.setItem(DRAFT_KEY, serialized);
  } catch {
    /* private mode / quota — fall through */
  }
  try {
    sessionStorage.setItem(DRAFT_KEY, serialized);
  } catch {
    /* ignore */
  }
}

export function getPlanChangeDraft(): PlanChangeDraft | null {
  try {
    const raw =
      localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PlanChangeDraft;
    if (!parsed?.package) return null;

    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS
    ) {
      clearPlanChangeDraft();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function updatePlanChangeDraft(
  patch: Partial<PlanChangeDraft>,
): PlanChangeDraft | null {
  const current = getPlanChangeDraft();
  if (!current) return null;
  const next = { ...current, ...patch };
  savePlanChangeDraft(next);
  return next;
}

export function clearPlanChangeDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPlanChangeDraft(): boolean {
  return getPlanChangeDraft() !== null;
}

/**
 * The plan-change fields every paid path sends to the server: Instapay's
 * submit-receipt body, the card checkout body, and (flattened) the
 * order-summary query.
 */
export function planChangeRequestBody(draft: PlanChangeDraft) {
  return {
    package: draft.package,
    packageCategory: draft.packageCategory,
    domain: draft.domain,
  };
}

export function planChangeSummaryParams(draft: PlanChangeDraft) {
  return {
    package: draft.package,
    packageCategory: draft.packageCategory,
    domainType: draft.domain?.domain_type,
    subdomain: draft.domain?.subdomain,
    customDomain: draft.domain?.custom_domain,
  };
}
