/**
 * Client-side onboarding draft.
 *
 * Registration form data is held here through plan / domain / payment so we
 * only write auth.users + brokers + profiles when onboarding actually completes
 * (free plan selected, or paid payment succeeds).
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

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function getOnboardingDraft(): OnboardingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    if (!parsed?.formData?.email || !parsed?.formData?.password) return null;
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
  sessionStorage.removeItem(DRAFT_KEY);
}

export function hasOnboardingDraft(): boolean {
  return getOnboardingDraft() !== null;
}
