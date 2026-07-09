const POST_PAYMENT_KEY = "onboarding_post_payment";

/** Set after successful payment so onboarding routes stay open while session hydrates. */
export function markPostPaymentPending() {
  sessionStorage.setItem(POST_PAYMENT_KEY, "true");
}

export function clearPostPaymentPending() {
  sessionStorage.removeItem(POST_PAYMENT_KEY);
}

export function isPostPaymentPending() {
  return sessionStorage.getItem(POST_PAYMENT_KEY) === "true";
}
