/**
 * Subscription billing constants. Single source of truth for cycle length and
 * how often the in-process billing monitor sweeps for expired periods.
 */

/** Length of one paid billing period in days. */
export const BILLING_CYCLE_DAYS = 30;

/** How often the server sweeps for expired subscriptions (ms). */
export const BILLING_MONITOR_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** How often the server sweeps custom-domain verification at Render (ms). */
export const DOMAIN_MONITOR_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/** How often custom-domain expiry dates are refreshed from name.com (ms). */
export const DOMAIN_EXPIRY_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Paid custom-domain sessions still not fulfilled after this age are recovered
 * by domainMonitor (GetDomain → continue DNS, or registration-failure refund).
 * The sweep never buys a domain without the Phase 3 atomic claim.
 */
export const DOMAIN_FULFILLMENT_STUCK_MS = 20 * 60 * 1000; // 20 minutes
