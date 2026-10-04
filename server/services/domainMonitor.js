import { brokerModel } from "../models/brokerModel.js";
import { DOMAIN_MONITOR_INTERVAL_MS } from "../config/billing.js";
import { getCustomDomain } from "./renderClient.js";

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
