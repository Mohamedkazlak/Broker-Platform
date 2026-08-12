import api from "@/lib/api";
import type {
  OnboardingDomainChoice,
  OnboardingFormData,
  PackageCategory,
  PlanId,
} from "@/lib/onboardingDraft";

/** Claim token lets the return page poll payment status without a login. */
const CLAIM_TOKEN_KEY = "reachi_payment_claim_token";

export function saveReachiClaimToken(token: string) {
  sessionStorage.setItem(CLAIM_TOKEN_KEY, token);
}

export function getReachiClaimToken(): string | null {
  return sessionStorage.getItem(CLAIM_TOKEN_KEY);
}

export function clearReachiClaimToken() {
  sessionStorage.removeItem(CLAIM_TOKEN_KEY);
}

interface CheckoutResponse {
  status: string;
  payUrl: string;
  claimToken: string | null;
}

interface DraftCheckoutParams {
  formData: OnboardingFormData;
  package: PlanId;
  packageCategory?: PackageCategory;
  domain: OnboardingDomainChoice;
  returnPath: string;
}

interface PlanChangeParams {
  package: PlanId;
  packageCategory?: PackageCategory;
  domain?: OnboardingDomainChoice;
}

/**
 * Existing, authenticated broker paying for a plan. With no `planChange` that
 * means the plan already on their row (finishing onboarding, or paying again
 * after a lapse); with one it's an upgrade / downgrade, which only takes effect
 * when the webhook confirms the payment.
 */
export async function createBrokerCheckoutSession(
  returnPath: string,
  planChange?: PlanChangeParams,
) {
  const { data } = await api.post<CheckoutResponse>("/payments/checkout", {
    returnPath,
    ...(planChange ?? {}),
  });
  return data;
}

/** Draft signup (no account yet) paying to complete registration. */
export async function createDraftCheckoutSession(params: DraftCheckoutParams) {
  const { data } = await api.post<CheckoutResponse>(
    "/payments/checkout",
    params,
  );
  return data;
}

export interface PaymentStatusPayload {
  orderId: string;
  status: "pending" | "completed" | "failed" | "expired" | "refunded";
  package: string;
  amount: number;
  currency: string;
  subdomain: string | null;
  session?: { access_token: string; refresh_token: string } | null;
}

export async function pollPaymentStatus(claimToken: string) {
  const { data } = await api.get<{ data: PaymentStatusPayload }>(
    "/payments/status",
    { params: { token: claimToken } },
  );
  return data.data;
}
