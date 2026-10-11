const POST_PAYMENT_KEY = "onboarding_post_payment";
const RENEWAL_KEY = "subscription_renewal";

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

/**
 * Past-due broker paying for the plan they already have (`?renew=1`).
 * Unlike a first signup, they already have a dashboard — success and the
 * Instapay review wait both belong there, not on branding setup.
 * Survives the round trip to the card gateway, which drops the query param.
 */
export function markSubscriptionRenewal() {
  try {
    sessionStorage.setItem(RENEWAL_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearSubscriptionRenewal() {
  try {
    sessionStorage.removeItem(RENEWAL_KEY);
  } catch {
    /* ignore */
  }
}

export function isSubscriptionRenewal() {
  try {
    return sessionStorage.getItem(RENEWAL_KEY) === "1";
  } catch {
    return false;
  }
}
