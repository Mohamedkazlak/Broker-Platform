import { brokerModel } from "../models/brokerModel.js";
import { instapayModel } from "../models/instapayModel.js";
import { validateSubdomainFormat } from "../utils/subdomainValidator.js";
import {
  generateDefaultSubdomain,
  isPendingSubdomain,
} from "../utils/subdomainGenerator.js";
import { PLANS_BY_ID, resolvePackageCategory } from "../config/plans.js";
import {
  isAllowedCustomDomainTld,
  ALLOWED_CUSTOM_DOMAIN_TLDS,
} from "../config/domains.js";
import {
  computeDaysUntilNextPayment,
  syncBrokerBillingState,
} from "../services/billingMonitor.js";
import {
  activateSubscription,
  resolvePlanChange,
} from "../services/subscription.js";
import { buildOrderSummary } from "../utils/orderSummary.js";
import {
  hasSocialLinkUpdates,
  normalizeSocialUpdates,
} from "../utils/socialLinks.js";

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

    const raw = await brokerModel.findById(req.params.id);

    if (!raw) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    // Lazily enforce expiry so settings / dashboard stay accurate even between
    // hourly billing-monitor sweeps.
    const data = await syncBrokerBillingState(raw);

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
      package_category,
      package_limit,
      created_at,
      ...safeUpdates
    } = req.body;

    const needsPlanCheck =
      safeUpdates.custom_domain !== undefined ||
      safeUpdates.subdomain !== undefined ||
      safeUpdates.hero_background_url !== undefined ||
      safeUpdates.platform_icon_url !== undefined ||
      hasSocialLinkUpdates(safeUpdates);

    let broker = null;
    if (needsPlanCheck) {
      broker = await brokerModel.findById(req.params.id);
      if (!broker) {
        return res
          .status(404)
          .json({ status: "error", error: "Broker not found" });
      }
    }

    // Free plan: standard subdomain only — no custom branding assets.
    if (
      broker?.package === "free" &&
      (safeUpdates.hero_background_url !== undefined ||
        safeUpdates.platform_icon_url !== undefined)
    ) {
      return res.status(400).json({
        status: "error",
        error: "Branding customization is not available on the Free plan",
        reason: "planNotEligible",
      });
    }

    // Free plan: no social media storefront links.
    if (broker?.package === "free" && hasSocialLinkUpdates(safeUpdates)) {
      return res.status(400).json({
        status: "error",
        error: "Social media links are not available on the Free plan",
        reason: "planNotEligible",
      });
    }

    if (hasSocialLinkUpdates(safeUpdates)) {
      const normalized = normalizeSocialUpdates(safeUpdates);
      if (!normalized.ok) {
        return res.status(400).json({
          status: "error",
          error: "Invalid social media link",
          reason: "invalidSocialLink",
          field: normalized.field,
        });
      }
    }

    if (safeUpdates.custom_domain !== undefined) {
      const customDomain = String(safeUpdates.custom_domain ?? "")
        .trim()
        .toLowerCase();

      if (!PLANS_BY_ID[broker.package]?.customDomain) {
        return res.status(400).json({
          status: "error",
          error: "Custom domains are not available on this plan",
          reason: "planNotEligible",
        });
      }

      if (!isAllowedCustomDomainTld(customDomain)) {
        return res.status(400).json({
          status: "error",
          error: `Custom domains must end in ${ALLOWED_CUSTOM_DOMAIN_TLDS.map((tld) => `.${tld}`).join(", ")}`,
          reason: "unsupportedTld",
        });
      }

      const taken = await brokerModel.findByCustomDomain(customDomain);
      if (taken && taken.id !== req.params.id) {
        return res.status(409).json({
          status: "error",
          error: "Custom domain already taken",
          reason: "taken",
        });
      }

      safeUpdates.custom_domain = customDomain;
    }

    if (safeUpdates.subdomain !== undefined) {
      const result = validateSubdomainFormat(safeUpdates.subdomain);
      if (!result.valid) {
        return res.status(400).json({
          status: "error",
          error: "Invalid subdomain",
          reason: result.reason,
        });
      }

      // Free plan keeps the auto-assigned subdomain and cannot change it.
      if (broker.package === "free" && result.normalized !== broker.subdomain) {
        return res.status(400).json({
          status: "error",
          error: "Subdomain customization is not available on the Free plan",
          reason: "planNotEligible",
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
 * Authenticated — plan selection, used both during onboarding (while
 * subscription_status is still 'pending') and later from the dashboard.
 *
 * - free: activate immediately (status 'active', no billing) → relay to dashboard.
 * - paid, not yet active: persist the chosen package but stay 'pending' →
 *   continue to domain setup.
 * - paid, already active: this is an upgrade / downgrade. Nothing is persisted —
 *   the broker keeps the plan they paid for until the new one is paid for and
 *   (for Instapay) approved. The chosen plan travels with the client through
 *   domain setup and payment, and is re-validated server-side at every step.
 */
export const selectPlan = async (req, res, next) => {
  try {
    if (req.brokerId !== req.params.id) {
      return res.status(403).json({ status: "error", error: "Access denied" });
    }

    const { package: pkg, packageCategory } = req.body;
    const plan = PLANS_BY_ID[pkg];
    if (!plan) {
      return res
        .status(400)
        .json({ status: "error", error: "Invalid plan selected" });
    }

    const broker = await brokerModel.findById(req.params.id);
    if (!broker) {
      return res
        .status(404)
        .json({ status: "error", error: "Broker not found" });
    }

    const category = resolvePackageCategory(pkg, packageCategory);

    if (pkg === "free") {
      const subdomain =
        broker.subdomain && !isPendingSubdomain(broker.subdomain)
          ? broker.subdomain
          : await generateDefaultSubdomain(
              broker.first_name,
              brokerModel.findIdBySubdomain.bind(brokerModel),
            );

      // Downgrading to Free costs nothing, so it applies right away — and the
      // custom domain goes with it, since Free doesn't include one.
      const data = await brokerModel.update(req.params.id, {
        package: "free",
        package_category: category,
        package_limit: plan.packageLimit,
        subdomain,
        domain_type: "subdomain",
        custom_domain: null,
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

    if (broker.subscription_status === "active") {
      // Validates the target plan without writing anything; the real switch
      // happens on payment (card) or admin approval (Instapay).
      const change = await resolvePlanChange(broker, {
        package: pkg,
        packageCategory,
      });

      return res.json({
        status: "success",
        redirect: "domain-setup",
        planChange: true,
        package: change.package,
        packageCategory: change.packageCategory,
        subdomain: broker.subdomain,
      });
    }

    // Paid plans mid-onboarding: lock in the package now, but keep them
    // 'pending' until they finish domain setup (and, later, payment).
    const data = await brokerModel.update(req.params.id, {
      package: pkg,
      package_category: category,
      package_limit: plan.packageLimit,
    });
    return res.json({
      status: "success",
      redirect: "domain-setup",
      subdomain: data.subdomain,
    });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ status: "error", error: error.message, reason: error.reason });
    }
    next(error);
  }
};

/**
 * GET /api/brokers/:id/order-summary
 * Authenticated — server-computed order breakdown (plan + optional custom
 * domain) for the payment page. The amount is always derived server-side.
 *
 * Optional query params quote a plan the broker is *considering* rather than
 * the one on their row, so an upgrade / downgrade can be priced before it is
 * paid for: ?package=max&domainType=custom&customDomain=foo.com
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

    const requestedPackage = req.query.package;
    if (requestedPackage) {
      const change = await resolvePlanChange(broker, {
        package: requestedPackage,
        packageCategory: req.query.packageCategory,
        domain: req.query.domainType
          ? {
              domain_type: req.query.domainType,
              subdomain: req.query.subdomain,
              custom_domain: req.query.customDomain,
            }
          : undefined,
      });

      return res.json({
        status: "success",
        summary: change.summary,
        planChange: {
          currentPackage: broker.package,
          package: change.package,
          domainType: change.domain_type,
          subdomain: change.subdomain,
          customDomain: change.custom_domain,
        },
      });
    }

    res.json({ status: "success", summary: buildOrderSummary(broker) });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ status: "error", error: error.message, reason: error.reason });
    }
    next(error);
  }
};

/**
 * POST /api/brokers/:id/simulate-payment { outcome: 'succeed' | 'fail' }
 * Authenticated — dev/testing fallback only. The real card-payment flow is
 * POST /api/payments/checkout (redirects to payment.reachi.ai) + the
 * POST /api/payments/webhook handler in paymentController.js, which is what
 * the client actually calls now (see onboarding/Payment.tsx). This endpoint
 * stays around for local testing when REACHI_PLATFORM_API_KEY isn't
 * configured — it exercises the same pending → active/past_due transition
 * without hitting the gateway.
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
