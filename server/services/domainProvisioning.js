import { brokerModel } from "../models/brokerModel.js";
import {
  RENDER_CNAME_TARGET,
  assertRenderCnameConfigured,
} from "../config/render.js";
import * as nameComClient from "./nameComClient.js";
import * as renderClient from "./renderClient.js";

/**
 * Background pipeline: buy the domain at name.com, point DNS at our Render
 * service, attach the domain on Render. Status lands on the broker row so
 * admins (and domainMonitor) can see where it got to.
 *
 * Deliberately never throws to the caller — approval endpoints fire this
 * without awaiting, and a mid-pipeline failure must not surface as an HTTP
 * error after the broker has already been activated. Failures set
 * domain_status = 'needs_review' for a human.
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
        { status: 400 },
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

    await brokerModel.update(brokerId, { domain_status: "dns_pending" });

    // www → CNAME. Apex uses ANAME (name.com's CNAME-at-root equivalent) so
    // we never need a static A-record IP — Render's hostname is the target.
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

    await brokerModel.update(brokerId, { domain_status: "attaching" });

    const attached = await renderClient.addCustomDomain(domain);
    const domainIdOrName = attached?.id || domain;
    try {
      await renderClient.verifyCustomDomain(domainIdOrName);
    } catch (verifyErr) {
      // Verify is best-effort here — DNS may still be propagating. The
      // domain monitor will re-check; don't fail the whole pipeline for it.
      console.warn(`${label} verify kicked off with warning:`, verifyErr);
    }

    await brokerModel.update(brokerId, {
      domain_status: "active",
      domain_last_error: null,
    });

    console.log(`${label} provisioned successfully`);
  } catch (err) {
    const message = err?.message || String(err);
    console.error(`${label} failed:`, err);
    try {
      await brokerModel.update(brokerId, {
        domain_status: "needs_review",
        domain_last_error: message,
      });
    } catch (updateErr) {
      console.error(`${label} failed to persist needs_review:`, updateErr);
    }
  }
}
