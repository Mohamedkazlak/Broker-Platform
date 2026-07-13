/**
 * Client-side onboarding draft.
 *
 * Registration form data is held here through plan / domain / payment so we
 * only write auth.users + brokers + profiles when onboarding actually completes
 * (free plan selected, or paid payment succeeds).
 *
 * Uses localStorage so a refresh (or closed tab reopen) keeps the draft until
 * the broker finishes onboarding or the draft is explicitly cleared.
 */

const DRAFT_KEY = "onboarding_draft";

export type PlanId = "free" | "plus" | "pro" | "ultra";

export interface OnboardingFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  platformName: string;
  phone: string;
  whatsapp: string;
  governorate: string;
}

export interface OnboardingDomainChoice {
  domain_type: "subdomain" | "custom";
  subdomain?: string;
  custom_domain?: string;
}

export interface OnboardingDraft {
  formData: OnboardingFormData;
  package?: PlanId;
  domain?: OnboardingDomainChoice;
}

function readRawDraft(): string | null {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  const serialized = JSON.stringify(draft);
  try {
    localStorage.setItem(DRAFT_KEY, serialized);
  } catch {
    /* private mode / quota — fall through */
  }
  // Keep a sessionStorage copy for same-tab continuity if localStorage fails.
  try {
    sessionStorage.setItem(DRAFT_KEY, serialized);
  } catch {
    /* ignore */
  }
}

export function getOnboardingDraft(): OnboardingDraft | null {
  try {
    const raw = readRawDraft();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    if (!parsed?.formData?.email || !parsed?.formData?.password) return null;

    // Migrate legacy sessionStorage-only drafts into localStorage.
    try {
      if (!localStorage.getItem(DRAFT_KEY)) {
        localStorage.setItem(DRAFT_KEY, raw);
      }
    } catch {
      /* ignore */
    }

    return parsed;
  } catch {
    return null;
  }
}

export function updateOnboardingDraft(
  patch: Partial<Omit<OnboardingDraft, "formData">> & {
    formData?: Partial<OnboardingFormData>;
  },
): OnboardingDraft | null {
  const current = getOnboardingDraft();
  if (!current) return null;
  const next: OnboardingDraft = {
    ...current,
    ...patch,
    formData: patch.formData
      ? { ...current.formData, ...patch.formData }
      : current.formData,
  };
  saveOnboardingDraft(next);
  return next;
}

export function clearOnboardingDraft(): void {
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

export function hasOnboardingDraft(): boolean {
  return getOnboardingDraft() !== null;
}
