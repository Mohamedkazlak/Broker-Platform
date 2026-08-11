import crypto from "crypto";
import { brokerModel } from "../models/brokerModel.js";
import { paymentModel } from "../models/paymentModel.js";
import { activateSubscription, buildOrderSummary } from "./brokerController.js";
import {
  assertRegistrationFormData,
  buildRegistrationOrderSummary,
  provisionBrokerAccount,
  resolveDomainFields,
  signInWithPassword,
} from "./authController.js";
import { PLANS_BY_ID } from "../config/plans.js";
import { APP_URL } from "../config/reachiPayment.js";
import {
  createPaymentSession,
  verifyWebhookSignature,
} from "../services/reachiPaymentClient.js";
import {
  encryptRegistrationPayload,
  decryptRegistrationPayload,
} from "../utils/registrationPayload.js";
import { createClaimToken, hashClaimToken } from "../utils/claimToken.js";
import { resolveBrokerIdFromAuth } from "../utils/resolveBrokerFromAuth.js";

/** Only the onboarding payment page is a valid return destination. */
const RETURN_PATH_PATTERN = /^\/[a-z]{2}\/payment$/;

function buildReturnUrl(returnPath) {
  if (typeof returnPath !== "string" || !RETURN_PATH_PATTERN.test(returnPath)) {
    throw Object.assign(new Error("Invalid returnPath"), { status: 400 });
  }
  return `${APP_URL}${returnPath}`;
}

function toStatusDto(session) {
  if (!session) return null;
  return {
    orderId: session.order_id,
    status: session.status,
    package: session.package,
    amount: Number(session.amount),
    currency: session.currency,
  };
}

/**
 * POST /api/payments/checkout
 *
 * Draft signup (no account yet, mirrors Instapay's draft path):
 *   Body: { formData, package, packageCategory, domain, returnPath }
 * Existing broker upgrade (Authorization Bearer):
 *   Body: { returnPath }
 *
 * Creates a payment_sessions row + a payment.reachi.ai checkout session and
 * hands back { payUrl, claimToken } for the client to redirect to. Nothing
 * about the broker/account changes here — only the webhook (source of truth)
 * does that once payment actually clears.
 */
export const checkout = async (req, res, next) => {
  try {
    const brokerId = await resolveBrokerIdFromAuth(req);

    if (brokerId) {
      return checkoutForBroker(req, res, brokerId);
    }
    return checkoutForDraft(req, res);
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ status: "error", error: error.message, reason: error.reason });
    }
    next(error);
  }
};

async function checkoutForBroker(req, res, brokerId) {
  const broker = await brokerModel.findById(brokerId);
  if (!broker) {
    return res.status(404).json({ status: "error", error: "Broker not found" });
  }

  if (broker.package === "free") {
    return res
      .status(400)
      .json({ status: "error", error: "The Free plan doesn't require payment" });
  }

  if (broker.subscription_status === "active") {
    return res
      .status(400)
      .json({ status: "error", error: "Subscription is already active" });
  }

  const returnUrl = buildReturnUrl(req.body?.returnPath);
  const summary = buildOrderSummary(broker);

  const orderId = `bp_${crypto.randomUUID()}`;
  const { token, hash } = createClaimToken();

  const session = await createPaymentSession({
    orderId,
    amount: summary.total.toFixed(2),
    currency: summary.currency,
    description: summary.planName,
    customer: {
      name: `${broker.first_name ?? ""} ${broker.last_name ?? ""}`.trim(),
      email: broker.email,
      phone: broker.phone_number,
    },
    returnUrl,
    items: buildLineItems(summary),
  });

  const created = await paymentModel.create({
    orderId,
    brokerId,
    package: broker.package,
    packageCategory: broker.package_category,
    amount: summary.total,
    currency: summary.currency,
    claimTokenHash: hash,
  });
  await paymentModel.update(created.id, {
    session_id: session.session_id,
    pay_url: session.pay_url,
    expires_at: session.expires_at,
  });

  res.json({ status: "success", payUrl: session.pay_url, claimToken: token });
}

async function checkoutForDraft(req, res) {
  const { formData, package: pkg, packageCategory, domain, returnPath } =
    req.body ?? {};

  assertRegistrationFormData(formData);

  const plan = PLANS_BY_ID[pkg];
  if (!plan || pkg === "free") {
    return res
      .status(400)
      .json({ status: "error", error: "This plan doesn't require payment" });
  }

  const normalizedEmail = String(formData.email).trim().toLowerCase();
  const existingEmail = await brokerModel.findByEmail(normalizedEmail);
  if (existingEmail) {
    return res.status(409).json({
      status: "error",
      error: "An account with this email already exists",
    });
  }

  const returnUrl = buildReturnUrl(returnPath);
  const domainFields = await resolveDomainFields(formData, pkg, domain);
  const summary = buildRegistrationOrderSummary(pkg, domainFields);

  const orderId = `bp_${crypto.randomUUID()}`;
  const { token, hash } = createClaimToken();

  const registrationPayload = encryptRegistrationPayload({
    formData: { ...formData, email: normalizedEmail },
    package: pkg,
    packageCategory,
    domain,
    domainFields,
  });

  const session = await createPaymentSession({
    orderId,
    amount: summary.total.toFixed(2),
    currency: summary.currency,
    description: summary.planName,
    customer: {
      name: `${formData.firstName ?? ""} ${formData.lastName ?? ""}`.trim(),
      email: normalizedEmail,
      phone: formData.phone,
    },
    returnUrl,
    items: buildLineItems(summary),
  });

  const created = await paymentModel.create({
    orderId,
    brokerId: null,
    package: pkg,
    packageCategory,
    amount: summary.total,
    currency: summary.currency,
    registrationPayload,
    claimTokenHash: hash,
  });
  await paymentModel.update(created.id, {
    session_id: session.session_id,
    pay_url: session.pay_url,
    expires_at: session.expires_at,
  });

  res.json({ status: "success", payUrl: session.pay_url, claimToken: token });
}

function buildLineItems(summary) {
  const items = [
    { name: summary.planName, quantity: 1, amount: summary.planPrice.toFixed(2) },
  ];
  if (summary.customDomain && summary.domainPrice > 0) {
    items.push({
      name: `Custom domain (${summary.customDomain})`,
      quantity: 1,
      amount: summary.domainPrice.toFixed(2),
    });
  }
  return items;
}

/**
 * GET /api/payments/status?token=...
 * Public claim-token poll — mirrors GET /api/instapay/status. The webhook is
 * what actually flips `status`; this just lets the return page watch for it.
 */
export const getCheckoutStatus = async (req, res, next) => {
  try {
    const token = String(req.query.token ?? "").trim();
    if (!token) {
      return res
        .status(400)
        .json({ status: "error", error: "Claim token is required" });
    }

    const session = await paymentModel.findByClaimTokenHash(
      hashClaimToken(token),
    );
    if (!session) {
      return res
        .status(404)
        .json({ status: "error", error: "Payment session not found" });
    }

    let subdomain = null;
    let authSession = null;

    if (session.broker_id) {
      const broker = await brokerModel.findById(session.broker_id);
      subdomain = broker?.subdomain ?? null;

      if (session.status === "completed" && session.registration_payload) {
        // Draft signup that just got provisioned by the webhook — hand off a
        // signed-in session the same way Instapay's claim poll does.
        try {
          const decrypted = decryptRegistrationPayload(
            session.registration_payload,
          );
          authSession = await signInWithPassword(
            decrypted.formData.email,
            decrypted.formData.password,
          );
          await paymentModel.update(session.id, { registration_payload: null });
        } catch (handOffErr) {
          console.error("Reachi payment session-handoff failed:", handOffErr);
        }
      }
    }

    res.json({
      status: "success",
      data: {
        ...toStatusDto(session),
        subdomain,
        session: authSession,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/webhook — payment.reachi.ai is the only caller. Must be
 * mounted with a raw-body parser (see server.js) so the HMAC signature can be
 * verified against the exact bytes sent, and BEFORE express.json().
 *
 * Idempotent by session_id: retries (up to 5, per the gateway's own backoff)
 * are safe to replay because a session already in a terminal status is a
 * silent no-op.
 */
export const handleWebhook = async (req, res) => {
  const rawBody = req.body; // Buffer, thanks to express.raw() on this route
  const signature = req.headers["x-reachi-signature"];

  if (!Buffer.isBuffer(rawBody) || !verifyWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { event, session_id, order_id, amount } = payload;

  try {
    const session =
      (session_id && (await paymentModel.findBySessionId(session_id))) ||
      (order_id && (await paymentModel.findByOrderId(order_id)));

    if (!session) {
      // Nothing we recognize — acknowledge so Reachi doesn't retry forever,
      // but don't pretend anything happened.
      console.error("Reachi webhook for unknown session:", { session_id, order_id });
      return res.status(200).json({ received: true });
    }

    // Already handled (retry) — no-op, respond 2xx.
    if (session.status === "completed" || session.status === "failed") {
      return res.status(200).json({ received: true });
    }

    if (event === "payment.completed") {
      if (Number(amount) !== Number(session.amount)) {
        console.error("Reachi webhook amount mismatch:", {
          session_id,
          expected: session.amount,
          received: amount,
        });
        return res.status(400).json({ error: "Amount mismatch" });
      }

      let brokerId = session.broker_id;

      if (brokerId) {
        await activateSubscription(brokerId, {
          package: session.package,
          billingAmount: Number(amount),
        });
      } else {
        // Draft signup — provision the account now that payment cleared.
        const decrypted = decryptRegistrationPayload(session.registration_payload);
        const normalizedEmail = decrypted.formData.email.trim().toLowerCase();

        // Guard against a double-click having created two sessions for the
        // same draft: if the account already exists, just link this session
        // to it rather than trying (and failing) to create it again.
        const existingBroker = await brokerModel.findByEmail(normalizedEmail);
        if (existingBroker) {
          brokerId = existingBroker.id;
        } else {
          const provisioned = await provisionBrokerAccount({
            formData: decrypted.formData,
            package: decrypted.package,
            packageCategory: decrypted.packageCategory,
            domain: decrypted.domain,
            domainFields: decrypted.domainFields,
            billingAmount: Number(amount),
          });
          brokerId = provisioned.broker.id;
        }
      }

      await paymentModel.update(session.id, {
        status: "completed",
        broker_id: brokerId,
        transaction_id: payload.transaction_id ?? null,
        completed_at: payload.completed_at ?? new Date().toISOString(),
      });
      return res.status(200).json({ received: true });
    }

    if (event === "payment.failed") {
      if (session.broker_id) {
        await brokerModel.update(session.broker_id, {
          subscription_status: "past_due",
        });
      }
      await paymentModel.update(session.id, { status: "failed" });
      return res.status(200).json({ received: true });
    }

    if (event === "payment.refunded") {
      if (session.broker_id) {
        await brokerModel.update(session.broker_id, {
          subscription_status: "past_due",
        });
      }
      await paymentModel.update(session.id, { status: "refunded" });
      return res.status(200).json({ received: true });
    }

    // Unrecognized event type — acknowledge, nothing to do.
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Reachi webhook processing failed:", error);
    // Non-2xx so payment.reachi.ai retries — this must have failed before
    // anything was durably recorded.
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};
