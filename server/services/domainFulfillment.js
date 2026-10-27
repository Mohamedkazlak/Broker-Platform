import { brokerModel } from "../models/brokerModel.js";
import { paymentModel } from "../models/paymentModel.js";
import { PLANS_BY_ID } from "../config/plans.js";
import { applyPlanChange } from "./subscription.js";
import {
  assertOfferedCustomDomainTld,
  getLiveDomainPrice,
} from "./domainPricing.js";
import { registerDomain } from "./nameComClient.js";
import { provisionCustomDomain } from "./domainProvisioning.js";
import { handleRegistrationFailure } from "./domainFailure.js";
import { decryptRegistrationPayload } from "../utils/registrationPayload.js";
import { provisionBrokerAccount } from "../controllers/authController.js";

/**
 * Background job after card payment for a custom-domain checkout.
 *
 * 1. Atomically claim pending → registering (only the winner continues).
 * 2. Re-check availability / USD ceiling; buy at name.com.
 * 3. Only then activate the broker (applyPlanChange / provisionBrokerAccount).
 * 4. Mark session registered, then kick DNS/Render (alreadyOwned path).
 * 5. On any failure before a successful buy+activate: handleRegistrationFailure.
 *
 * Never throws to the webhook caller — all errors are persisted on the session.
 *
 * @param {string} paymentSessionId  payment_sessions.id
 */
export async function fulfillPaidCustomDomainSession(paymentSessionId) {
  const label = `[domain-fulfillment] session=${paymentSessionId}`;

  try {
    const claimed = await paymentModel.claimDomainFulfillment(paymentSessionId);
    if (!claimed) {
      console.log(`${label} claim lost or not claimable — exiting`);
      return;
    }

    await runClaimedFulfillment(claimed, label);
  } catch (err) {
    console.error(`${label} unhandled:`, err);
    try {
      const session = await paymentModel.findById(paymentSessionId);
      if (
        session &&
        session.domain_fulfillment_status === "registering" &&
        session.refund_status === "none"
      ) {
        await handleRegistrationFailure(
          session,
          err?.message || "domain fulfillment failed",
        );
      }
    } catch (persistErr) {
      console.error(`${label} failed to persist failure:`, persistErr);
    }
  }
}

/**
 * Resume after we already own the domain at name.com (sweep path).
 * Does NOT buy. Activates the broker if needed, marks registered, kicks DNS.
 *
 * @param {object} session
 */
export async function continueFulfillmentAfterOwned(session) {
  const label = `[domain-fulfillment] continue-owned session=${session.id}`;
  const domain = String(session.requested_custom_domain ?? "")
    .trim()
    .toLowerCase();
  if (!domain) {
    await handleRegistrationFailure(session, "missing requested_custom_domain");
    return;
  }

  // Ensure we are in registering (or already registering) before activate.
  let current = session;
  if (current.domain_fulfillment_status === "pending") {
    const claimed = await paymentModel.claimDomainFulfillment(session.id);
    if (!claimed) {
      console.log(`${label} could not claim pending session — exiting`);
      return;
    }
    current = claimed;
  }

  if (current.domain_fulfillment_status === "registered") {
    await kickDnsPipeline(current, domain, label);
    return;
  }

  try {
    const brokerId = await activateBrokerForSession(current, domain);
    const registered = await paymentModel.update(current.id, {
      domain_fulfillment_status: "registered",
      broker_id: brokerId,
    });
    await kickDnsPipeline(registered, domain, label);
  } catch (err) {
    console.error(`${label} activate/DNS kick failed:`, err);
    // Domain is owned but activate failed — admin must review; do NOT auto-refund
    // (we hold a real name.com domain). Flag session + alert.
    await paymentModel.update(current.id, {
      domain_fulfillment_status: "failed",
      refund_reason:
        `owned at name.com but activate failed: ${err?.message || err}`.slice(
          0,
          500,
        ),
    });
    const { alertAdmins } = await import("./adminAlert.js");
    alertAdmins(
      `Session ${current.id} owns ${domain} at name.com but broker activate failed: ${err?.message || err}`,
      { urgent: true },
    );
  }
}

async function runClaimedFulfillment(session, label) {
  const domain = String(session.requested_custom_domain ?? "")
    .trim()
    .toLowerCase();
  if (!domain) {
    await handleRegistrationFailure(session, "missing requested_custom_domain");
    return;
  }

  const ceiling = Number(session.domain_quoted_price_usd);
  if (!Number.isFinite(ceiling) || ceiling <= 0) {
    await handleRegistrationFailure(
      session,
      "missing or invalid domain_quoted_price_usd ceiling",
    );
    return;
  }

  try {
    await assertOfferedCustomDomainTld(domain);

    const taken = await brokerModel.findByCustomDomain(domain);
    if (taken && taken.id !== session.broker_id) {
      await handleRegistrationFailure(session, "domain taken");
      return;
    }

    let live;
    try {
      live = await getLiveDomainPrice(domain);
    } catch (err) {
      const reason =
        err?.reason === "taken"
          ? "domain taken"
          : err?.reason === "premium"
            ? "premium domain not available"
            : err?.message || "availability/price check failed";
      await handleRegistrationFailure(session, reason);
      return;
    }

    if (live.priceUSD > ceiling) {
      await handleRegistrationFailure(
        session,
        `price above ceiling (live ${live.priceUSD} USD > ${ceiling} USD)`,
      );
      return;
    }

    await registerDomain(domain, ceiling);
  } catch (err) {
    await handleRegistrationFailure(
      session,
      err?.message || "name.com registration failed",
    );
    return;
  }

  // Buy succeeded — activate only now. Persist registered before DNS returns.
  try {
    const brokerId = await activateBrokerForSession(session, domain);
    const registered = await paymentModel.update(session.id, {
      domain_fulfillment_status: "registered",
      broker_id: brokerId,
    });
    console.log(`${label} registered domain=${domain} broker=${brokerId}`);
    await kickDnsPipeline(registered, domain, label);
  } catch (err) {
    // Domain purchased but activate failed — money + domain held; needs admin.
    console.error(`${label} post-buy activate failed:`, err);
    await paymentModel.update(session.id, {
      refund_reason:
        `domain bought but activate failed: ${err?.message || err}`.slice(
          0,
          500,
        ),
    });
    const { alertAdmins } = await import("./adminAlert.js");
    alertAdmins(
      `Session ${session.id} bought ${domain} but broker activate failed: ${err?.message || err}. No auto-refund.`,
      { urgent: true },
    );
  }
}

async function activateBrokerForSession(session, domain) {
  const planPrice = PLANS_BY_ID[session.package]?.price ?? 0;

  if (session.broker_id) {
    const change = await planChangeFromSession(session, domain);
    await applyPlanChange(session.broker_id, change, {
      billingAmount: planPrice,
    });
    await brokerModel.update(session.broker_id, {
      domain_type: "custom",
      custom_domain: domain,
      domain_status: "registering",
      domain_last_error: null,
    });
    return session.broker_id;
  }

  const decrypted = decryptRegistrationPayload(session.registration_payload);
  const normalizedEmail = decrypted.formData.email.trim().toLowerCase();
  const existingRow = await brokerModel.findByEmail(normalizedEmail);
  if (existingRow) {
    const existingBroker = await brokerModel.findById(existingRow.id);
    const change = {
      package: session.package,
      packageCategory: session.package_category,
      domain_type: "custom",
      subdomain: existingBroker.subdomain,
      custom_domain: domain,
    };
    await applyPlanChange(existingBroker.id, change, {
      billingAmount: planPrice,
    });
    await brokerModel.update(existingBroker.id, {
      domain_type: "custom",
      custom_domain: domain,
      domain_status: "registering",
      domain_last_error: null,
    });
    return existingBroker.id;
  }

  const provisioned = await provisionBrokerAccount({
    formData: decrypted.formData,
    package: decrypted.package,
    packageCategory: decrypted.packageCategory,
    domain: decrypted.domain,
    domainFields: {
      ...decrypted.domainFields,
      domain_type: "custom",
      custom_domain: domain,
    },
    billingAmount: planPrice,
  });

  await brokerModel.update(provisioned.broker.id, {
    domain_status: "registering",
    domain_last_error: null,
  });

  return provisioned.broker.id;
}

async function planChangeFromSession(session, domain) {
  const broker = await brokerModel.findById(session.broker_id);
  return {
    package: session.package ?? broker.package,
    packageCategory: session.package_category ?? broker.package_category,
    domain_type: "custom",
    subdomain: session.requested_subdomain ?? broker.subdomain,
    custom_domain: domain,
  };
}

async function kickDnsPipeline(session, domain, label) {
  const brokerId = session.broker_id;
  const ceiling = Number(session.domain_quoted_price_usd);
  if (!brokerId) {
    console.error(`${label} no broker_id after register — cannot start DNS`);
    return;
  }

  // Fire-and-forget; DNS/Render failures land on broker.needs_review.
  provisionCustomDomain(brokerId, domain, ceiling).catch(async (err) => {
    console.error(`${label} DNS/Render pipeline error:`, err);
    try {
      await brokerModel.update(brokerId, {
        domain_status: "needs_review",
        domain_last_error: err?.message || String(err),
      });
    } catch (updateErr) {
      console.error(`${label} failed to persist needs_review:`, updateErr);
    }
  });
}

/**
 * Kick fulfillment without awaiting (webhook-safe).
 * @param {string} paymentSessionId
 */
export function startDomainFulfillment(paymentSessionId) {
  setImmediate(() => {
    fulfillPaidCustomDomainSession(paymentSessionId).catch((err) => {
      console.error(
        `[domain-fulfillment] background job crashed session=${paymentSessionId}:`,
        err,
      );
    });
  });
}
