/**
 * Subscription billing constants. Single source of truth for cycle length and
 * how often the in-process billing monitor sweeps for expired periods.
 */

/** Length of one paid billing period in days. */
export const BILLING_CYCLE_DAYS = 30;

/** How often the server sweeps for expired subscriptions (ms). */
export const BILLING_MONITOR_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
