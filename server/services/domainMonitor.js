import { brokerModel } from "../models/brokerModel.js";
import {
  DOMAIN_EXPIRY_SYNC_INTERVAL_MS,
  DOMAIN_MONITOR_INTERVAL_MS,
} from "../config/billing.js";
import { getCustomDomain } from "./renderClient.js";
import { listAccountDomains, parseDomainExpireDate } from "./nameComClient.js";

/**
 * True when Render reports the custom domain as verified (DNS + ready for
 * cert issuance). Accepts either the raw field or a nested customDomain.
 */
function isDomainVerified(payload) {
  const row = payload?.customDomain ?? payload;
  const status = String(row?.verificationStatus ?? "").toLowerCase();
  return status === "verified";
}

/**
 * Sweep brokers stuck in dns_pending / attaching and ask Render whether the
 * custom domain has verified yet. Caps retries at 5 attempts, then parks the
 * row in needs_review for a human.
 *
 * @returns {{ activated: number, retried: number, needsReview: number }}
 */
export async function runDomainMonitor() {
  const candidates = await brokerModel.findForDomainMonitorSweep();
  let activated = 0;
  let retried = 0;
  let needsReview = 0;

  for (const broker of candidates) {
    const domain = broker.custom_domain;
    if (!domain) continue;

    const attempts = Number(broker.domain_attempts) || 0;

    try {
      const current = await getCustomDomain(domain);
      if (isDomainVerified(current)) {
        await brokerModel.update(broker.id, {
          domain_status: "active",
          domain_last_error: null,
        });
        activated += 1;
        continue;
      }

      const nextAttempts = attempts + 1;
      if (nextAttempts >= 5) {
        await brokerModel.update(broker.id, {
          domain_attempts: nextAttempts,
          domain_status: "needs_review",
          domain_last_error:
            "Render custom domain still unverified after 5 monitor attempts",
        });
        needsReview += 1;
      } else {
        await brokerModel.update(broker.id, {
          domain_attempts: nextAttempts,
          domain_last_error: "Render custom domain not verified yet",
        });
        retried += 1;
      }
    } catch (err) {
      const message = err?.message || String(err);
      const nextAttempts = attempts + 1;
      if (nextAttempts >= 5) {
        await brokerModel.update(broker.id, {
          domain_attempts: nextAttempts,
          domain_status: "needs_review",
          domain_last_error: message,
        });
        needsReview += 1;
      } else {
        await brokerModel.update(broker.id, {
          domain_attempts: nextAttempts,
          domain_last_error: message,
        });
        retried += 1;
      }
    }
  }

  if (activated > 0 || retried > 0 || needsReview > 0) {
    console.log(
      `[domain-monitor] activated=${activated} retried=${retried} needsReview=${needsReview}`,
    );
  }

  return { activated, retried, needsReview };
}

/** Start the periodic sweep. Runs once immediately, then on the configured interval. */
export function startDomainMonitor() {
  const tick = () => {
    runDomainMonitor().catch((err) => {
      console.error("[domain-monitor] sweep failed:", err);
    });
  };

  tick();
  const handle = setInterval(tick, DOMAIN_MONITOR_INTERVAL_MS);
  // Don't keep the process alive solely for the monitor during tests / short runs.
  if (typeof handle.unref === "function") handle.unref();
  return handle;
}

function sameInstant(stored, iso) {
  if (!stored || !iso) return false;
  const left = new Date(stored).getTime();
  const right = new Date(iso).getTime();
  return !Number.isNaN(left) && left === right;
}

/**
 * Decide which brokers need a new domain_expires_at from a finished name.com
 * list. Brokers with no custom domain are ignored. A domain missing from the
 * list, or listed without a usable expireDate, is reported and not cleared.
 *
 * @param {Array<{ id: string, custom_domain?: string|null, domain_expires_at?: string|null }>} brokers
 * @param {Array<{ domainName?: string, expireDate?: string }>} nameComDomains
 */
export function planDomainExpiryUpdates(brokers, nameComDomains) {
  const byName = new Map();
  for (const row of nameComDomains ?? []) {
    const name = String(row?.domainName ?? "")
      .trim()
      .toLowerCase();
    if (!name) continue;
    byName.set(name, row);
  }

  const updates = [];
  const missing = [];
  const unreadable = [];

  for (const broker of brokers ?? []) {
    const domain = String(broker?.custom_domain ?? "")
      .trim()
      .toLowerCase();
    if (!domain) continue;

    const listed = byName.get(domain);
    if (!listed) {
      missing.push({ id: broker.id, domain });
      continue;
    }

    const expiresAt = parseDomainExpireDate(listed.expireDate);
    if (!expiresAt) {
      unreadable.push({ id: broker.id, domain });
      continue;
    }

    if (sameInstant(broker.domain_expires_at, expiresAt)) continue;
    updates.push({ id: broker.id, domain_expires_at: expiresAt });
  }

  return { updates, missing, unreadable };
}

/**
 * Refresh domain_expires_at from name.com for brokers that have a custom
 * domain. A failed list call throws before any row is written.
 *
 * @returns {Promise<{ updated: number, missing: number }>}
 */
export async function runDomainExpirySync() {
  const domains = await listAccountDomains();
  const brokers = await brokerModel.findWithCustomDomain();
  const plan = planDomainExpiryUpdates(brokers, domains);

  for (const row of plan.missing) {
    console.warn(
      `[domain-monitor] custom domain not listed at name.com broker_id=${row.id} domain=${row.domain}`,
    );
  }
  for (const row of plan.unreadable) {
    console.warn(
      `[domain-monitor] name.com listed domain without expireDate broker_id=${row.id} domain=${row.domain}`,
    );
  }

  let updated = 0;
  for (const update of plan.updates) {
    try {
      await brokerModel.update(update.id, {
        domain_expires_at: update.domain_expires_at,
      });
      updated += 1;
    } catch (err) {
      console.error(
        `[domain-monitor] expiry update failed broker_id=${update.id}:`,
        err,
      );
    }
  }

  if (updated > 0 || plan.missing.length > 0) {
    console.log(
      `[domain-monitor] expiry sync updated=${updated} missing=${plan.missing.length}`,
    );
  }

  return { updated, missing: plan.missing.length };
}

/** Refresh expiry dates once now, then every 24 hours. */
export function startDomainExpirySync() {
  const tick = () => {
    runDomainExpirySync().catch((err) => {
      console.error("[domain-monitor] expiry sync failed:", err);
    });
  };

  tick();
  const handle = setInterval(tick, DOMAIN_EXPIRY_SYNC_INTERVAL_MS);
  if (typeof handle.unref === "function") handle.unref();
  return handle;
}
