import { brokerModel } from "../models/brokerModel.js";
import { paymentModel } from "../models/paymentModel.js";
import {
  DOMAIN_EXPIRY_SYNC_INTERVAL_MS,
  DOMAIN_FULFILLMENT_STUCK_MS,
  DOMAIN_MONITOR_INTERVAL_MS,
} from "../config/billing.js";
import { getCustomDomain, verifyCustomDomain } from "./renderClient.js";
import {
  getDomain,
  listAccountDomains,
  parseDomainExpireDate,
} from "./nameComClient.js";
import {
  DNS_ATTEMPT_LIMIT,
  attachDomainOnRender,
  ensureDomainDns,
  isRenderDomainReady,
  wwwHostname,
} from "./domainProvisioning.js";
import { alertAdmins } from "./adminAlert.js";
import { continueFulfillmentAfterOwned } from "./domainFulfillment.js";
import {
  handleRegistrationFailure,
  retrySessionRefund,
} from "./domainFailure.js";

const VERIFY_ATTEMPT_LIMIT = 5;

/**
 * Sweep brokers stuck mid-provision + recover paid custom-domain sessions:
 *   - dns_pending: retry DNS (domain_dns_attempts); on success attach → verifying
 *   - attaching: finish interrupted Render attach only (recorded attach
 *     failures already wrote needs_review and are not swept / not auto-retried)
 *   - verifying: ask Render whether apex + www are verified; only then → active
 *   - paid sessions still pending/registering after 20m: GetDomain → continue
 *     DNS if we own it, else registration-failure refund. Never buys without
 *     the Phase 3 atomic claim.
 *   - refund_status requested|failed: retry the full-amount refund
 *
 * Render fields used for "ready / cert issued":
 *   GET custom-domain → verificationStatus === "verified" on BOTH apex and www.
 *   Official schema has no certificateStatus; Render issues TLS after verified.
 *
 * @returns {{ activated: number, retried: number, needsReview: number, fulfillmentRecovered: number, refundsRetried: number }}
 */
export async function runDomainMonitor() {
  const candidates = await brokerModel.findForDomainMonitorSweep();
  let activated = 0;
  let retried = 0;
  let needsReview = 0;

  for (const broker of candidates) {
    const domain = broker.custom_domain;
    if (!domain) continue;

    const status = broker.domain_status;
    const label = `[domain-monitor] broker=${broker.id} domain=${domain}`;

    try {
      if (status === "dns_pending") {
        const result = await retryDnsThenAttach(broker, domain, label);
        if (result === "needs_review") needsReview += 1;
        else if (result === "retried") retried += 1;
        continue;
      }

      if (status === "attaching") {
        // Interrupted attach only — recorded failures are needs_review.
        await attachDomainOnRender(broker.id, domain, label);
        retried += 1;
        continue;
      }

      // verifying — only path that may set active
      if (status === "verifying") {
        const result = await checkVerification(broker, domain, label);
        if (result === "activated") activated += 1;
        else if (result === "needs_review") needsReview += 1;
        else retried += 1;
      }
    } catch (err) {
      const message = err?.message || String(err);
      console.error(`${label} sweep error:`, err);

      if (status === "dns_pending") {
        const next = (Number(broker.domain_dns_attempts) || 0) + 1;
        if (next >= DNS_ATTEMPT_LIMIT) {
          const reviewMessage = `DNS setup failed after ${DNS_ATTEMPT_LIMIT} attempts: ${message}`;
          await brokerModel.update(broker.id, {
            domain_dns_attempts: next,
            domain_status: "needs_review",
            domain_last_error: reviewMessage,
          });
          alertAdmins(
            `domain DNS needs_review broker=${broker.id} domain=${domain}: ${reviewMessage}`,
          );
          needsReview += 1;
        } else {
          await brokerModel.update(broker.id, {
            domain_dns_attempts: next,
            domain_last_error: message,
          });
          retried += 1;
        }
        continue;
      }

      // Attach must not auto-retry after a recorded failure.
      if (status === "attaching") {
        await brokerModel.update(broker.id, {
          domain_status: "needs_review",
          domain_last_error: message,
        });
        alertAdmins(
          `domain Render attach needs_review broker=${broker.id} domain=${domain}: ${message}`,
        );
        needsReview += 1;
        continue;
      }

      const nextVerify = (Number(broker.domain_verify_attempts) || 0) + 1;
      if (nextVerify >= VERIFY_ATTEMPT_LIMIT) {
        const reviewMessage = `Render verification failed after ${VERIFY_ATTEMPT_LIMIT} attempts: ${message}`;
        await brokerModel.update(broker.id, {
          domain_verify_attempts: nextVerify,
          domain_status: "needs_review",
          domain_last_error: reviewMessage,
        });
        alertAdmins(
          `domain verify needs_review broker=${broker.id} domain=${domain}: ${reviewMessage}`,
        );
        needsReview += 1;
      } else {
        await brokerModel.update(broker.id, {
          domain_verify_attempts: nextVerify,
          domain_last_error: message,
        });
        retried += 1;
      }
    }
  }

  const fulfillmentRecovered = await recoverStuckFulfillmentSessions();
  const refundsRetried = await retryFailedRefunds();

  if (
    activated > 0 ||
    retried > 0 ||
    needsReview > 0 ||
    fulfillmentRecovered > 0 ||
    refundsRetried > 0
  ) {
    console.log(
      `[domain-monitor] activated=${activated} retried=${retried} needsReview=${needsReview} fulfillmentRecovered=${fulfillmentRecovered} refundsRetried=${refundsRetried}`,
    );
  }

  return {
    activated,
    retried,
    needsReview,
    fulfillmentRecovered,
    refundsRetried,
  };
}

/**
 * Paid custom-domain sessions still not fulfilled after 20 minutes.
 * GetDomain only — never registerDomain from the sweep.
 */
async function recoverStuckFulfillmentSessions() {
  const olderThanIso = new Date(
    Date.now() - DOMAIN_FULFILLMENT_STUCK_MS,
  ).toISOString();
  const stuck = await paymentModel.findStuckDomainFulfillment(olderThanIso);
  let recovered = 0;

  for (const session of stuck) {
    const domain = String(session.requested_custom_domain ?? "")
      .trim()
      .toLowerCase();
    const label = `[domain-monitor] fulfillment-recover session=${session.id} domain=${domain}`;
    if (!domain) continue;

    try {
      const lookup = await getDomain(domain);
      if (lookup.owned) {
        console.log(`${label} name.com owns domain — continuing DNS path`);
        await continueFulfillmentAfterOwned(session);
      } else {
        console.log(
          `${label} name.com does not own domain — registration failure`,
        );
        await handleRegistrationFailure(
          session,
          "domain registration not completed (recovery sweep)",
        );
      }
      recovered += 1;
    } catch (err) {
      console.error(`${label} recover error:`, err);
      // Leave state for next sweep; do not buy.
    }
  }

  return recovered;
}

async function retryFailedRefunds() {
  const rows = await paymentModel.findRefundRetries();
  let retried = 0;

  for (const session of rows) {
    const label = `[domain-monitor] refund-retry session=${session.id}`;
    try {
      const before = session.refund_status;
      const updated = await retrySessionRefund(session);
      if (updated?.refund_status !== before) {
        retried += 1;
        console.log(`${label} ${before} → ${updated.refund_status}`);
      } else if (updated?.refund_status === "failed") {
        // Still failed — urgent alert so a paid failed refund is never silent.
        alertAdmins(
          `Paid session ${session.id} refund still failed (domain=${session.requested_custom_domain}). Money taken, no refund.`,
          { urgent: true },
        );
        retried += 1;
      }
    } catch (err) {
      console.error(`${label} error:`, err);
      alertAdmins(
        `Paid session ${session.id} refund retry threw: ${err?.message || err}`,
        { urgent: true },
      );
    }
  }

  return retried;
}

async function retryDnsThenAttach(broker, domain, label) {
  try {
    await ensureDomainDns(domain);
  } catch (err) {
    const message = err?.message || String(err);
    const next = (Number(broker.domain_dns_attempts) || 0) + 1;
    if (next >= DNS_ATTEMPT_LIMIT) {
      const reviewMessage = `DNS setup failed after ${DNS_ATTEMPT_LIMIT} attempts: ${message}`;
      await brokerModel.update(broker.id, {
        domain_dns_attempts: next,
        domain_status: "needs_review",
        domain_last_error: reviewMessage,
      });
      alertAdmins(
        `domain DNS needs_review broker=${broker.id} domain=${domain}: ${reviewMessage}`,
      );
      return "needs_review";
    }
    await brokerModel.update(broker.id, {
      domain_dns_attempts: next,
      domain_status: "dns_pending",
      domain_last_error: message,
    });
    console.warn(`${label} DNS retry scheduled attempts=${next}:`, message);
    return "retried";
  }

  // DNS ok — attach once. Attach failure → needs_review (no auto-retry).
  try {
    await attachDomainOnRender(broker.id, domain, label);
    return "retried";
  } catch (err) {
    const message = err?.message || String(err);
    await brokerModel.update(broker.id, {
      domain_status: "needs_review",
      domain_last_error: message,
    });
    alertAdmins(
      `domain Render attach needs_review broker=${broker.id} domain=${domain}: ${message}`,
    );
    return "needs_review";
  }
}

async function checkVerification(broker, domain, label) {
  const attempts = Number(broker.domain_verify_attempts) || 0;
  const apexKey = broker.render_domain_id || domain;
  const wwwName = wwwHostname(domain);

  const [apexPayload, wwwPayload] = await Promise.all([
    getCustomDomain(apexKey),
    getCustomDomain(wwwName),
  ]);

  const apexReady = isRenderDomainReady(apexPayload);
  const wwwReady = isRenderDomainReady(wwwPayload);

  if (apexReady && wwwReady) {
    await brokerModel.update(broker.id, {
      domain_status: "active",
      domain_last_error: null,
      domain_provisioned_at: new Date().toISOString(),
    });
    console.log(`${label} both apex and www verified → active`);
    return "activated";
  }

  // Kick verify while still waiting (best-effort).
  for (const target of [apexKey, wwwName]) {
    try {
      await verifyCustomDomain(target);
    } catch {
      /* ignore — monitor will re-check next sweep */
    }
  }

  const nextAttempts = attempts + 1;
  const waitingFor = [!apexReady ? "apex" : null, !wwwReady ? "www" : null]
    .filter(Boolean)
    .join("+");

  if (nextAttempts >= VERIFY_ATTEMPT_LIMIT) {
    const reviewMessage = `Render custom domain still unverified after ${VERIFY_ATTEMPT_LIMIT} monitor attempts (waiting: ${waitingFor})`;
    await brokerModel.update(broker.id, {
      domain_verify_attempts: nextAttempts,
      domain_status: "needs_review",
      domain_last_error: reviewMessage,
    });
    alertAdmins(
      `domain verify needs_review broker=${broker.id} domain=${domain}: ${reviewMessage}`,
    );
    return "needs_review";
  }

  await brokerModel.update(broker.id, {
    domain_verify_attempts: nextAttempts,
    domain_last_error: `Render custom domain not verified yet (waiting: ${waitingFor})`,
  });
  return "retried";
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
