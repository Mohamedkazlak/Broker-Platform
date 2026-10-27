import { brokerModel } from "../models/brokerModel.js";
import {
  RENDER_CNAME_TARGET,
  assertRenderCnameConfigured,
} from "../config/render.js";
import * as nameComClient from "./nameComClient.js";
import * as renderClient from "./renderClient.js";
import { alertAdmins } from "./adminAlert.js";

const DNS_ATTEMPT_LIMIT = 5;

/**
 * Background pipeline: buy the domain at name.com, point DNS at our Render
 * service, attach apex + www on Render. Status lands on the broker row so
 * admins (and domainMonitor) can see where it got to.
 *
 * Deliberately never throws to the caller — approval endpoints fire this
 * without awaiting, and a mid-pipeline failure must not surface as an HTTP
 * error after the broker has already been activated.
 *
 * Status honesty:
 *   registering → dns_pending → attaching → verifying
 * Only domainMonitor.runDomainMonitor may set `active`, and only when Render
 * reports both apex and www as verified (certificate issuance is not a
 * separate API field — see isRenderDomainReady).
 *
 * DNS failures stay on dns_pending and are retried by the monitor (counted in
 * domain_dns_attempts; needs_review + admin alert after 5). Render attach
 * failures go straight to needs_review and are never auto-retried.
 *
 * @param {string} brokerId
 * @param {string} domain
 * @param {number} purchasePriceUsd name.com purchasePrice ceiling
 */
export async function provisionCustomDomain(
  brokerId,
  domain,
  purchasePriceUsd,
) {
  const label = `[domain-provisioning] broker=${brokerId} domain=${domain}`;

  try {
    const existing = await brokerModel.findById(brokerId);
    if (existing?.domain_status === "active") {
      console.log(`${label} already active, skipping`);
      return;
    }

    assertRenderCnameConfigured();

    if (
      typeof purchasePriceUsd !== "number" ||
      !Number.isFinite(purchasePriceUsd) ||
      purchasePriceUsd <= 0
    ) {
      throw Object.assign(
        new Error(
          `Invalid purchasePriceUsd for ${domain}: ${String(purchasePriceUsd)}`,
        ),
        { status: 400, fatal: true },
      );
    }

    await brokerModel.update(brokerId, {
      domain_status: "registering",
      domain_last_error: null,
    });

    const registration = await nameComClient.registerDomain(
      domain,
      purchasePriceUsd,
    );
    if (registration?.alreadyOwned) {
      console.log(`${label} already registered at name.com, continuing to DNS`);
    }

    // expireDate is optional. A missing value, or a failure to store it,
    // must not fail the purchase; the daily sync can fill it in later.
    const domainExpiresAt =
      nameComClient.expireDateFromRegistration(registration);
    const orderId =
      registration?.order != null ? String(registration.order) : null;
    const registered = { domain_status: "dns_pending" };
    if (domainExpiresAt) registered.domain_expires_at = domainExpiresAt;
    if (orderId) registered.name_com_order_id = orderId;

    try {
      await brokerModel.update(brokerId, registered);
    } catch (err) {
      if (!domainExpiresAt && !orderId) throw err;
      console.warn(
        `${label} could not save domain expiry/order, continuing registration:`,
        err?.message || err,
      );
      await brokerModel.update(brokerId, { domain_status: "dns_pending" });
    }

    await ensureDomainDns(domain);
    await attachDomainOnRender(brokerId, domain, label);

    console.log(`${label} attached; waiting for Render verification`);
  } catch (err) {
    if (err?.dnsRetryable) {
      await handleDnsFailure(brokerId, domain, err, label);
      return;
    }

    const message = err?.message || String(err);
    console.error(`${label} failed:`, err);
    try {
      await brokerModel.update(brokerId, {
        domain_status: "needs_review",
        domain_last_error: message,
      });
      alertAdmins(
        `domain needs_review broker=${brokerId} domain=${domain}: ${message}`,
      );
    } catch (updateErr) {
      console.error(`${label} failed to persist needs_review:`, updateErr);
    }
  }
}

/**
 * www → CNAME and apex → ANAME, both pointing at RENDER_CNAME_TARGET.
 * Safe to repeat: identical existing records count as done.
 *
 * @param {string} domain
 */
export async function ensureDomainDns(domain) {
  assertRenderCnameConfigured();

  try {
    await nameComClient.createDnsRecord(domain, {
      host: "www",
      type: "CNAME",
      answer: RENDER_CNAME_TARGET,
      ttl: 300,
    });
    await nameComClient.createDnsRecord(domain, {
      host: "",
      type: "ANAME",
      answer: RENDER_CNAME_TARGET,
      ttl: 300,
    });
  } catch (err) {
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
      dnsRetryable: true,
    });
  }
}

/**
 * Attach apex + www on Render. Already-attached is success. Any attach
 * failure is fatal (needs_review; no automatic retry). Leaves status at
 * `verifying` — never `active`.
 *
 * @param {string} brokerId
 * @param {string} domain
 * @param {string} [label]
 */
export async function attachDomainOnRender(brokerId, domain, label) {
  const log =
    label || `[domain-provisioning] broker=${brokerId} domain=${domain}`;

  await brokerModel.update(brokerId, { domain_status: "attaching" });

  const wwwName = wwwHostname(domain);

  let apex;
  let www;
  try {
    apex = await renderClient.addCustomDomain(domain);
    www = await renderClient.addCustomDomain(wwwName);
  } catch (err) {
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
      fatal: true,
    });
  }

  const apexId = apex?.id || null;
  const updates = {
    domain_status: "verifying",
    domain_last_error: null,
  };
  if (apexId) updates.render_domain_id = String(apexId);

  await brokerModel.update(brokerId, updates);

  // Best-effort kick — DNS may still be propagating. Monitor re-checks.
  for (const target of [apex?.id || domain, www?.id || wwwName]) {
    try {
      await renderClient.verifyCustomDomain(target);
    } catch (verifyErr) {
      console.warn(`${log} verify kicked off with warning:`, verifyErr);
    }
  }

  return { apex, www };
}

/**
 * True when Render reports this custom domain verified.
 *
 * Fields read (official Custom Domains API schema):
 *   - verificationStatus === "verified"  (required for ready)
 *
 * There is no certificateStatus / sslStatus / certificateIssued field on
 * Render's customDomain object. Render docs say TLS is issued automatically
 * once verification succeeds; we treat verified as the cert-ready signal.
 *
 * @param {object|null|undefined} payload getCustomDomain response
 */
export function isRenderDomainReady(payload) {
  const row = renderClient.unwrapCustomDomain(payload);
  const status = String(row?.verificationStatus ?? "").toLowerCase();
  return status === "verified";
}

export function wwwHostname(domain) {
  const d = String(domain ?? "")
    .trim()
    .toLowerCase();
  if (!d) return "";
  return d.startsWith("www.") ? d : `www.${d}`;
}

async function handleDnsFailure(brokerId, domain, err, label) {
  const message = err?.message || String(err);
  console.error(`${label} DNS failed (retryable):`, err);

  let attempts = 0;
  try {
    const row = await brokerModel.findById(brokerId);
    attempts = (Number(row?.domain_dns_attempts) || 0) + 1;
  } catch {
    attempts = 1;
  }

  if (attempts >= DNS_ATTEMPT_LIMIT) {
    const reviewMessage = `DNS setup failed after ${DNS_ATTEMPT_LIMIT} attempts: ${message}`;
    try {
      await brokerModel.update(brokerId, {
        domain_dns_attempts: attempts,
        domain_status: "needs_review",
        domain_last_error: reviewMessage,
      });
      alertAdmins(
        `domain DNS needs_review broker=${brokerId} domain=${domain}: ${reviewMessage}`,
      );
    } catch (updateErr) {
      console.error(`${label} failed to persist needs_review:`, updateErr);
    }
    return;
  }

  try {
    await brokerModel.update(brokerId, {
      domain_dns_attempts: attempts,
      domain_status: "dns_pending",
      domain_last_error: message,
    });
  } catch (updateErr) {
    console.error(`${label} failed to persist dns_pending retry:`, updateErr);
  }
}

export { DNS_ATTEMPT_LIMIT };
