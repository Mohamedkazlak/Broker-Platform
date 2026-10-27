import { brokerModel } from "../models/brokerModel.js";
import { paymentModel } from "../models/paymentModel.js";
import { PLANS_BY_ID } from "../config/plans.js";
import { refundPaymentSession } from "./reachiPaymentClient.js";
import { alertAdmins } from "./adminAlert.js";
import { notifyBrokerDomainFailure } from "./brokerNotify.js";

/**
 * Format the full Reachi session amount for an explicit refund call.
 * Never omit amount — Reachi must not default a partial refund.
 *
 * @param {object} session payment_sessions row
 * @returns {string} decimal string e.g. "1500.00"
 */
export function fullSessionRefundAmount(session) {
  const n = Number(session?.amount);
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(
      new Error(`Invalid session amount for refund: ${String(session?.amount)}`),
      { status: 500 },
    );
  }
  return n.toFixed(2);
}

/**
 * Persist registration-failure state, release the domain hold, refund the
 * FULL session amount, and notify the broker (EN+AR).
 *
 * Phase 3 buys the domain BEFORE activating the broker, so on failure the
 * broker row was never changed — nothing to roll back for new signups or
 * upgrades. This still verifies that and logs if somehow mutated.
 *
 * Every durable field is written before this function returns.
 *
 * @param {object} session
 * @param {string} reasonPlain
 * @returns {Promise<object>} updated session
 */
export async function handleRegistrationFailure(session, reasonPlain) {
  const reason = String(reasonPlain || "domain registration failed").slice(
    0,
    500,
  );
  const label = `[domain-failure] session=${session.id} domain=${session.requested_custom_domain}`;

  await assertBrokerUntouched(session, label);

  // Hold release: fulfillment=failed (and refund_status ≠ none) drops the
  // Phase 1 live-hold unique index. Persist failure before calling Reachi.
  let updated = await paymentModel.update(session.id, {
    domain_fulfillment_status: "failed",
    refund_status: "requested",
    refund_reason: reason,
  });

  updated = await attemptSessionRefund(updated, {
    reason,
    notifyKind: "registration_failed",
    label,
  });

  return updated;
}

/**
 * Retry a refund for sessions with refund_status requested|failed.
 * Always passes the full session amount explicitly.
 *
 * @param {object} session
 * @returns {Promise<object>} updated session
 */
export async function retrySessionRefund(session) {
  if (!session?.session_id) {
    throw Object.assign(new Error("Session has no Reachi session_id"), {
      status: 400,
    });
  }
  if (!["requested", "failed"].includes(session.refund_status)) {
    return session;
  }

  const reason =
    session.refund_reason || "retrying domain registration refund";
  const label = `[domain-failure] refund-retry session=${session.id}`;

  return attemptSessionRefund(session, {
    reason,
    notifyKind: "registration_failed",
    label,
  });
}

/**
 * Admin-only: refund the full paid session amount, then put the broker back
 * on a usable subdomain baseline (free plan, no custom domain). Never
 * automatic. Requires a confirmation reason.
 *
 * @param {object} params
 * @param {object} params.session
 * @param {object} params.broker
 * @param {string} params.reason
 * @param {{ id: string, email?: string }} params.admin
 */
export async function refundAndRevertBroker({
  session,
  broker,
  reason,
  admin,
}) {
  const confirmation = String(reason ?? "").trim();
  if (!confirmation) {
    throw Object.assign(
      new Error("A confirmation reason is required for refund and revert"),
      { status: 400 },
    );
  }

  const adminLabel = admin?.email || admin?.id || "unknown";
  const now = new Date().toISOString();
  const refundReason = `admin refund+revert by ${adminLabel} at ${now}: ${confirmation}`.slice(
    0,
    500,
  );
  const label = `[domain-failure] refund-revert broker=${broker.id} session=${session.id}`;

  let updated = await paymentModel.update(session.id, {
    domain_fulfillment_status: "failed",
    refund_status: "requested",
    refund_reason: refundReason,
  });

  updated = await attemptSessionRefund(updated, {
    reason: refundReason,
    notifyKind: "refund_and_revert",
    label,
    brokerOverride: broker,
  });

  const free = PLANS_BY_ID.free;
  await brokerModel.update(broker.id, {
    package: "free",
    package_limit: free?.packageLimit ?? 1,
    billing_amount: 0,
    next_billing_date: null,
    subscription_status: "active",
    domain_type: "subdomain",
    custom_domain: null,
    domain_status: null,
    domain_last_error: null,
    name_com_order_id: null,
    render_domain_id: null,
    domain_dns_attempts: 0,
    domain_verify_attempts: 0,
    domain_expires_at: null,
    domain_provisioned_at: null,
  });

  console.log(
    `${label} broker reverted to free/subdomain by admin=${adminLabel}`,
  );

  return updated;
}

/**
 * @param {object} session
 * @param {{ reason: string, notifyKind: string, label: string, brokerOverride?: object }} opts
 */
async function attemptSessionRefund(session, opts) {
  const { reason, notifyKind, label, brokerOverride } = opts;
  const amount = fullSessionRefundAmount(session);

  if (!session.session_id) {
    const failed = await paymentModel.update(session.id, {
      refund_status: "failed",
      refund_reason: `${reason} (no Reachi session_id)`.slice(0, 500),
    });
    alertAdmins(
      `Paid domain session ${session.id} cannot refund: missing session_id. Money taken, no refund. reason=${reason}`,
      { urgent: true },
    );
    return failed;
  }

  try {
    await refundPaymentSession(session.session_id, {
      amount,
      reason: reason.slice(0, 200),
    });
  } catch (err) {
    const message = err?.message || String(err);
    console.error(`${label} refund API failed:`, err);
    const failed = await paymentModel.update(session.id, {
      refund_status: "failed",
      refund_reason: `${reason} | refund error: ${message}`.slice(0, 500),
    });
    alertAdmins(
      `Paid domain session ${session.id} (domain=${session.requested_custom_domain}) refund FAILED after registration failure. Money taken, no refund. amount=${amount} ${session.currency}. ${message}`,
      { urgent: true },
    );
    return failed;
  }

  const refundedAt = new Date().toISOString();
  let updated = await paymentModel.update(session.id, {
    refund_status: "refunded",
    refunded_at: refundedAt,
    status: "refunded",
    refund_reason: reason,
  });

  if (!updated.broker_notified_at) {
    const broker =
      brokerOverride ||
      (session.broker_id ? await brokerModel.findById(session.broker_id) : null);
    const email =
      broker?.email ||
      (await emailFromRegistrationPayload(session)) ||
      null;

    notifyBrokerDomainFailure({
      email,
      domain: session.requested_custom_domain || "(unknown)",
      reasonPlain: reason,
      amount,
      currency: session.currency || "EGP",
      kind: notifyKind,
    });

    updated = await paymentModel.update(session.id, {
      broker_notified_at: new Date().toISOString(),
    });
  }

  return updated;
}

async function emailFromRegistrationPayload(session) {
  if (!session?.registration_payload) return null;
  try {
    const { decryptRegistrationPayload } = await import(
      "../utils/registrationPayload.js"
    );
    const decrypted = decryptRegistrationPayload(session.registration_payload);
    return decrypted?.formData?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Registration failure must leave the broker row untouched. Upgrades keep
 * their prior plan/domain; drafts have no broker yet.
 */
async function assertBrokerUntouched(session, label) {
  if (!session.broker_id) {
    console.log(`${label} draft signup — no broker row to roll back`);
    return;
  }

  const broker = await brokerModel.findById(session.broker_id);
  if (!broker) {
    console.log(`${label} broker_id set but row missing — nothing to roll back`);
    return;
  }

  const requested = String(session.requested_custom_domain ?? "")
    .trim()
    .toLowerCase();
  const onBroker = String(broker.custom_domain ?? "")
    .trim()
    .toLowerCase();

  // If somehow the custom domain was already written, that is a Phase 3 bug;
  // still refund, but scream so an admin notices.
  if (requested && onBroker && onBroker === requested) {
    alertAdmins(
      `${label} broker ${broker.id} already has custom_domain=${onBroker} during registration failure — expected untouched. Manual review.`,
      { urgent: true },
    );
  } else {
    console.log(
      `${label} broker ${broker.id} untouched (package=${broker.package} domain_type=${broker.domain_type})`,
    );
  }
}
