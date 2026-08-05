import { brokerModel } from "../models/brokerModel.js";
import {
  BILLING_CYCLE_DAYS,
  BILLING_MONITOR_INTERVAL_MS,
} from "../config/billing.js";

/**
 * Parse a billing timestamp from Postgres / Supabase into a valid Date.
 * Handles ISO strings and the space-separated form Postgres sometimes returns.
 */
export function parseBillingDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const withT = raw.includes("T") ? raw : raw.replace(" ", "T");
  // Node rejects "+00" but accepts "+00:00"
  const normalized = withT.replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Add `days` to a date in UTC (avoids DST surprises). */
export function addBillingDays(fromDate, days = BILLING_CYCLE_DAYS) {
  const date = new Date(fromDate.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

/**
 * Whole days from now until next billing. Null for free / non-active / missing
 * dates so the client never does date math on an irrelevant value.
 */
export function computeDaysUntilNextPayment(broker) {
  if (!broker) return null;
  if (broker.package === "free" || broker.subscription_status !== "active") {
    return null;
  }

  const next = parseBillingDate(broker.next_billing_date);
  if (!next) return null;

  const diffMs = next.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

/** True when a paid broker's period has ended (or was never set and created_at + cycle has passed). */
export function isBillingPeriodExpired(broker) {
  if (!broker || broker.package === "free") return false;
  if (broker.subscription_status !== "active") return false;

  const next = parseBillingDate(broker.next_billing_date);
  if (next) return next.getTime() <= Date.now();

  const created = parseBillingDate(broker.created_at);
  if (!created) return false;
  return addBillingDays(created).getTime() <= Date.now();
}

/**
 * Next billing ISO after a successful paid activation / plan change / renewal.
 * Always starts a fresh cycle from now (now + BILLING_CYCLE_DAYS), including
 * mid-month plan changes — payment restarts the period.
 */
export function resolveNextBillingDate(_broker) {
  return addBillingDays(new Date()).toISOString();
}

/**
 * Lazily sync one broker's billing state:
 * - Backfill missing next_billing_date for active paid plans from created_at
 * - Flip active → past_due when the period has expired
 *
 * Returns the (possibly updated) broker row.
 */
export async function syncBrokerBillingState(broker) {
  if (!broker || broker.package === "free") return broker;

  if (broker.subscription_status === "active" && !broker.next_billing_date) {
    const created = parseBillingDate(broker.created_at) ?? new Date();
    const next = addBillingDays(created);

    if (next.getTime() <= Date.now()) {
      return brokerModel.update(broker.id, {
        subscription_status: "past_due",
        next_billing_date: next.toISOString(),
      });
    }

    return brokerModel.update(broker.id, {
      next_billing_date: next.toISOString(),
    });
  }

  if (isBillingPeriodExpired(broker)) {
    return brokerModel.update(broker.id, {
      subscription_status: "past_due",
    });
  }

  return broker;
}

/**
 * Sweep all active paid brokers whose billing period has ended and mark them
 * past_due. Also backfills missing next_billing_date values.
 *
 * @returns {{ markedPastDue: number, backfilled: number }}
 */
export async function runBillingMonitor() {
  const candidates = await brokerModel.findActivePaidForBillingSweep();
  let markedPastDue = 0;
  let backfilled = 0;

  for (const broker of candidates) {
    const beforeStatus = broker.subscription_status;
    const beforeNext = broker.next_billing_date;
    const synced = await syncBrokerBillingState(broker);

    if (
      beforeStatus === "active" &&
      synced.subscription_status === "past_due"
    ) {
      markedPastDue += 1;
    } else if (!beforeNext && synced.next_billing_date) {
      backfilled += 1;
    }
  }

  if (markedPastDue > 0 || backfilled > 0) {
    console.log(
      `[billing-monitor] markedPastDue=${markedPastDue} backfilled=${backfilled}`,
    );
  }

  return { markedPastDue, backfilled };
}

/** Start the periodic sweep. Runs once immediately, then on the configured interval. */
export function startBillingMonitor() {
  const tick = () => {
    runBillingMonitor().catch((err) => {
      console.error("[billing-monitor] sweep failed:", err);
    });
  };

  tick();
  const handle = setInterval(tick, BILLING_MONITOR_INTERVAL_MS);
  // Don't keep the process alive solely for the monitor during tests / short runs.
  if (typeof handle.unref === "function") handle.unref();
  return handle;
}
