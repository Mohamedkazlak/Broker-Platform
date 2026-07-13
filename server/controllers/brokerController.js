import { brokerModel } from "../models/brokerModel.js";
import { instapayModel } from "../models/instapayModel.js";
import { validateSubdomainFormat } from "../utils/subdomainValidator.js";
import {
  generateDefaultSubdomain,
  isPendingSubdomain,
} from "../utils/subdomainGenerator.js";
import { PLANS_BY_ID } from "../config/plans.js";
import { priceForDomain, DOMAIN_CURRENCY } from "../config/domains.js";

/**
 * Compute a broker's order total from server-side config only: the plan price
 * for their current package plus the mock domain price (re-derived from the
 * flat TLD table when they chose a custom domain). Never trusts client input.
 */
function buildOrderSummary(broker) {
  const plan = PLANS_BY_ID[broker.package] ?? null;
  const planPrice = plan?.price ?? 0;
  const isCustom = broker.domain_type === "custom" && !!broker.custom_domain;
  const domainPrice = isCustom ? priceForDomain(broker.custom_domain) : 0;

  return {
    package: broker.package,
    planName: plan?.name ?? broker.package,
    planPrice,
    currency: plan?.currency ?? DOMAIN_CURRENCY,
    domainType: broker.domain_type,
    customDomain: isCustom ? broker.custom_domain : null,
    domainPrice,
    total: planPrice + domainPrice,
  };
}

/**
 * Whole days from now until the next billing date. Null for free plans, for
 * non-active subscriptions, or when no billing date is set — so the client
 * never does date math on a missing/irrelevant value.
 */
function computeDaysUntilNextPayment(broker) {
  if (broker.package === "free" || broker.subscription_status !== "active") {
    return null;
  }
  if (!broker.next_billing_date) return null;

  const diffMs = new Date(broker.next_billing_date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86_400_000));
}

/** Billing cycle length until the next charge (stub — monthly; annual would be 365). */
const BILLING_CYCLE_DAYS = 30;

/**
 * Activates a paid subscription after successful payment.
 * Shared by simulate-payment and the future Paymob webhook handler.
 *
 * @param {string} brokerId
 * @param {{ package: string, billingAmount?: number }} planDetails
 *   `package` — plan id from the catalog; `billingAmount` optional override
 *   (defaults to server-computed order total: plan price + custom domain fee).
 */
export async function activateSubscription(brokerId, planDetails) {
  const plan = PLANS_BY_ID[planDetails.package];
  if (!plan) {
    throw new Error(`Invalid plan: ${planDetails.package}`);
  }

  const broker = await brokerModel.findById(brokerId);
  if (!broker) {
    throw new Error("Broker not found");
  }

  const { total } = buildOrderSummary(broker);
  const billingAmount = planDetails.billingAmount ?? total;

  const nextBilling = new Date();
  nextBilling.setDate(nextBilling.getDate() + BILLING_CYCLE_DAYS);

  return brokerModel.update(brokerId, {
    subscription_status: "active",
    next_billing_date: nextBilling.toISOString(),
    billing_amount: billingAmount,
    package: planDetails.package,
    package_limit: plan.packageLimit,
  });
}

/**
 * GET /api/brokers/check-subdomain?subdomain=...
 * Public, advisory-only availability check for the signup form. The database
 * unique index is the real source of truth; this endpoint just gives the user
 * fast feedback while typing.
 */
export const checkSubdomainAvailability = async (req, res, next) => {
  try {
    const { subdomain } = req.query;

    // Reject impossible formats before touching the database.
    const result = validateSubdomainFormat(subdomain);
    if (!result.valid) {
      return res.json({ available: false, reason: result.reason });
    }

    const existing = await brokerModel.findIdBySubdomain(result.normalized);
    if (existing) {
      return res.json({ available: false, reason: "taken" });
    }

    const pending = await instapayModel.findPendingBySubdomain(
      result.normalized,
    );
    if (pending) {
      return res.json({ available: false, reason: "taken" });
    }

    res.json({ available: true });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/brokers/subdomain/:subdomain
 * Public — resolves a broker by subdomain.
 */
export const getBySubdomain = async (req, res, next) => {
  try {
    const data = await brokerModel.findBySubdomain(req.params.subdomain);

    if (!data) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    res.json({
      status: "success",
      data: {
        id: data.id,
        platform_name: data.platform_name,
        subdomain: data.subdomain,
        email: data.email,
        phone_number: data.phone_number,
        whatsapp_number: data.whatsapp_number,
        package: data.package,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/brokers/:id
 * Authenticated — returns full broker details.
 */
export const getById = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: "error", error: "Access denied" });
    }

    const data = await brokerModel.findById(req.params.id);

    if (!data) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    res.json({
      status: "success",
      data: {
        ...data,
        days_until_next_payment: computeDaysUntilNextPayment(data),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/brokers/:id
 * Authenticated — updates broker settings (only owner).
 */
export const update = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: "error", error: "Access denied" });
    }

    const {
      id,
      package: pkg,
      package_limit,
      created_at,
      ...safeUpdates
    } = req.body;

    if (safeUpdates.subdomain !== undefined) {
      const result = validateSubdomainFormat(safeUpdates.subdomain);
      if (!result.valid) {
        return res.status(400).json({
          status: "error",
          error: "Invalid subdomain",
          reason: result.reason,
        });
      }

      const existing = await brokerModel.findIdBySubdomain(result.normalized);
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({
          status: "error",
          error: "Subdomain already taken",
          reason: "taken",
        });
      }

      safeUpdates.subdomain = result.normalized;
    }

    const data = await brokerModel.update(req.params.id, safeUpdates);
    res.json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/brokers/:id/select-plan
 * Authenticated — onboarding plan selection step (runs on the main host while
 * subscription_status is still 'pending').
 *
 * - free: activate immediately (status 'active', no billing) → relay to dashboard.
 * - paid: persist the chosen package but stay 'pending' → continue to domain setup.
 */
export const selectPlan = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: "error", error: "Access denied" });
    }

    const { package: pkg } = req.body;
    const plan = PLANS_BY_ID[pkg];
    if (!plan) {
      return res
        .status(400)
        .json({ status: "error", error: "Invalid plan selected" });
    }

    if (pkg === "free") {
      const broker = await brokerModel.findById(req.params.id);
      if (!broker) {
        return res
          .status(404)
          .json({ status: "error", error: "Broker not found" });
      }

      const subdomain =
        broker.subdomain && !isPendingSubdomain(broker.subdomain)
          ? broker.subdomain
          : await generateDefaultSubdomain(
              broker.first_name,
              brokerModel.findIdBySubdomain.bind(brokerModel),
            );

      const data = await brokerModel.update(req.params.id, {
        package: "free",
        package_limit: plan.packageLimit,
        subdomain,
        subscription_status: "active",
        next_billing_date: null,
        billing_amount: 0,
      });
      return res.json({
        status: "success",
        redirect: "dashboard",
        subdomain: data.subdomain,
      });
    }

    // Paid plans: lock in the package now, but keep them 'pending' until they
    // finish domain setup (and, later, payment).
    const data = await brokerModel.update(req.params.id, {
      package: pkg,
      package_limit: plan.packageLimit,
    });
    return res.json({
      status: "success",
      redirect: "domain-setup",
      subdomain: data.subdomain,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/brokers/:id/order-summary
 * Authenticated — server-computed order breakdown (plan + optional custom
 * domain) for the payment page. The amount is always derived server-side.
 */
export const getOrderSummary = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: "error", error: "Access denied" });
    }

    const broker = await brokerModel.findById(req.params.id);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    res.json({ status: "success", summary: buildOrderSummary(broker) });
  } catch (error) {
    next(error);
  }
};

/**
 * PAYMENT INTEGRATION BOUNDARY
 * ─────────────────────────────────────────────────────────────────────────────
 * This endpoint currently simulates payment for prototyping purposes.
 * When integrating Paymob (or any other PSP), REPLACE this handler with:
 *
 * 1. Create a Paymob order via their API (POST /ecommerce/orders)
 * 2. Obtain an Paymob payment token
 * 3. Return the payment iframe URL to the client
 * 4. Receive the webhook callback at POST /api/webhooks/paymob (to be created)
 * 5. In the webhook handler, verify HMAC signature, then call activateSubscription()
 *
 * The activateSubscription() helper below handles all subscription state changes
 * and is shared between simulate-payment and the future Paymob webhook handler.
 *
 * Required env vars for production:
 *   PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_HMAC_SECRET
 *
 * Webhook URL (must be public HTTPS — configure after VPS deploy):
 *   https://myflats.com/api/webhooks/paymob
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POST /api/brokers/:id/simulate-payment { outcome: 'succeed' | 'fail' }
 * Authenticated — simulates a payment processor. No real charge happens; this
 * exercises the same pending → active/past_due transition a real provider
 * would, so a real integration later only touches this endpoint.
 *
 * The charged amount is always recomputed server-side from the plan + domain
 * choice (never trusts a client-sent total).
 */
export const simulatePayment = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: "error", error: "Access denied" });
    }

    const { outcome } = req.body;
    if (outcome !== "succeed" && outcome !== "fail") {
      return res.status(400).json({
        status: "error",
        error: "outcome must be 'succeed' or 'fail'",
      });
    }

    const broker = await brokerModel.findById(req.params.id);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    if (outcome === "fail") {
      await brokerModel.update(req.params.id, {
        subscription_status: "past_due",
      });
      return res.json({
        status: "success",
        outcome: "fail",
        subscription_status: "past_due",
      });
    }

    const data = await activateSubscription(req.params.id, {
      package: broker.package,
    });
    const { total } = buildOrderSummary(broker);

    return res.json({
      status: "success",
      outcome: "succeed",
      redirect: "dashboard",
      subdomain: data.subdomain,
      billingAmount: total,
    });
  } catch (error) {
    next(error);
  }
};
