import { brokerModel } from "../models/brokerModel.js";
import { instapayModel } from "../models/instapayModel.js";
import { PLANS_BY_ID, resolvePackageCategory } from "../config/plans.js";
import { isAllowedCustomDomainTld } from "../config/domains.js";
import { validateSubdomainFormat } from "../utils/subdomainValidator.js";
import { buildOrderSummary } from "../utils/orderSummary.js";
import { resolveNextBillingDate } from "./billingMonitor.js";

/**
 * Activates a paid subscription after successful payment.
 * Shared by simulate-payment, Instapay approval, and the Reachi webhook.
 *
 * Always restarts `next_billing_date` to now + 30 days (plan change mid-month,
 * renewal, or first activation all get a fresh cycle after successful payment).
 *
 * @param {string} brokerId
 * @param {{ package: string, packageCategory?: string, billingAmount?: number }} planDetails
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

  const { total } = buildOrderSummary({
    ...broker,
    package: planDetails.package,
  });
  const billingAmount = planDetails.billingAmount ?? total;

  return brokerModel.update(brokerId, {
    subscription_status: "active",
    next_billing_date: resolveNextBillingDate(broker),
    billing_amount: billingAmount,
    package: planDetails.package,
    package_category: resolvePackageCategory(
      planDetails.package,
      planDetails.packageCategory ?? broker.package_category,
    ),
    package_limit: plan.packageLimit,
  });
}

function badRequest(message, extra = {}) {
  return Object.assign(new Error(message), { status: 400, ...extra });
}

/**
 * Resolve the domain a plan change should end up on.
 *
 * A change may carry its own domain choice (the broker walked through the
 * domain step again), or none at all — in which case they keep what they have,
 * except when the target plan can't hold a custom domain, where we fall back to
 * their subdomain so a downgrade can't leave a custom domain attached to a plan
 * that doesn't include one.
 */
async function resolvePlanChangeDomain(broker, plan, domain) {
  const keepSubdomain = {
    domain_type: "subdomain",
    subdomain: broker.subdomain,
    custom_domain: null,
  };

  if (!domain?.domain_type) {
    if (broker.domain_type === "custom" && broker.custom_domain) {
      return plan.customDomain
        ? {
            domain_type: "custom",
            subdomain: broker.subdomain,
            custom_domain: broker.custom_domain,
          }
        : keepSubdomain;
    }
    return keepSubdomain;
  }

  if (domain.domain_type === "subdomain") {
    const result = validateSubdomainFormat(domain.subdomain);
    if (!result.valid) {
      throw badRequest("Invalid subdomain", { reason: result.reason });
    }

    if (result.normalized !== broker.subdomain) {
      const existing = await brokerModel.findIdBySubdomain(result.normalized);
      if (existing && existing.id !== broker.id) {
        throw Object.assign(new Error("Subdomain already taken"), {
          status: 409,
          reason: "taken",
        });
      }

      const reserved = await instapayModel.findPendingBySubdomain(
        result.normalized,
      );
      if (reserved && reserved.broker_id !== broker.id) {
        throw Object.assign(new Error("Subdomain already taken"), {
          status: 409,
          reason: "taken",
        });
      }
    }

    return {
      domain_type: "subdomain",
      subdomain: result.normalized,
      custom_domain: null,
    };
  }

  if (domain.domain_type !== "custom") {
    throw badRequest("Invalid domain type");
  }

  if (!plan.customDomain) {
    throw badRequest("Custom domains are not available on this plan", {
      reason: "planNotEligible",
    });
  }

  const customDomain = String(domain.custom_domain ?? "")
    .trim()
    .toLowerCase();
  if (!customDomain) {
    throw badRequest("Custom domain is required");
  }
  if (!isAllowedCustomDomainTld(customDomain)) {
    throw badRequest("Unsupported custom domain extension", {
      reason: "unsupportedTld",
    });
  }

  if (customDomain !== broker.custom_domain) {
    const taken = await brokerModel.findByCustomDomain(customDomain);
    if (taken && taken.id !== broker.id) {
      throw Object.assign(new Error("Custom domain already taken"), {
        status: 409,
        reason: "taken",
      });
    }

    const reserved =
      await instapayModel.findPendingByCustomDomain(customDomain);
    if (reserved && reserved.broker_id !== broker.id) {
      throw Object.assign(new Error("Custom domain already taken"), {
        status: 409,
        reason: "taken",
      });
    }
  }

  return {
    domain_type: "custom",
    subdomain: broker.subdomain,
    custom_domain: customDomain,
  };
}

/**
 * Validate a requested upgrade / downgrade against the plan catalog and the
 * broker's current state, and price it server-side.
 *
 * Nothing is written here: a plan change only becomes real once the payment
 * behind it clears (Reachi webhook) or an admin approves the Instapay receipt.
 * That's the whole point — an active broker keeps the plan they paid for while
 * the new one is still unpaid or awaiting review.
 *
 * @returns the normalized change, or null when the request doesn't ask for one.
 */
export async function resolvePlanChange(broker, request) {
  const pkg = request?.package;
  if (!pkg) return null;

  const plan = PLANS_BY_ID[pkg];
  if (!plan) {
    throw badRequest("Invalid plan selected");
  }
  if (pkg === "free") {
    throw badRequest("The Free plan doesn't require payment");
  }

  const domainFields = await resolvePlanChangeDomain(
    broker,
    plan,
    request.domain,
  );

  const changesPackage = pkg !== broker.package;
  const changesDomain =
    domainFields.domain_type !== broker.domain_type ||
    (domainFields.domain_type === "custom"
      ? domainFields.custom_domain !== broker.custom_domain
      : domainFields.subdomain !== broker.subdomain);

  // Re-paying for exactly what you already have is only meaningful when the
  // subscription lapsed (past_due) or was never activated.
  if (
    !changesPackage &&
    !changesDomain &&
    broker.subscription_status === "active"
  ) {
    throw badRequest("This is already your current plan");
  }

  const summary = buildOrderSummary({
    package: pkg,
    domain_type: domainFields.domain_type,
    custom_domain: domainFields.custom_domain,
  });

  return {
    package: pkg,
    packageCategory: resolvePackageCategory(pkg, request.packageCategory),
    ...domainFields,
    changesPackage,
    changesDomain,
    summary,
  };
}

/**
 * Move the broker onto the subdomain a plan change asked for, before the
 * payment behind it has been reviewed.
 *
 * The plan itself still waits for approval — only the URL moves now, so a
 * broker who renamed their platform isn't stuck on the old address for as long
 * as their receipt sits in the review queue. A custom domain is never moved
 * early: it's a paid capability of the plan being bought, and the broker isn't
 * entitled to it until that plan is active. `domain_type` and `custom_domain`
 * are likewise left alone, so a downgrade can't strip a custom domain that is
 * still paid for — `applyPlanChange` settles those on approval.
 *
 * Free brokers are excluded, matching the settings rule that gates subdomain
 * edits behind a paid plan (see brokerController.updateBroker).
 *
 * @returns the subdomain the broker is on afterwards. Losing the race for the
 *   name leaves them where they were, and the submission's reservation applies
 *   it on approval instead — a slow rename beats a failed payment.
 */
export async function applyPlanChangeSubdomain(broker, change) {
  const unchanged = { subdomain: broker.subdomain, applied: false };

  if (
    !change ||
    change.domain_type !== "subdomain" ||
    !change.subdomain ||
    change.subdomain === broker.subdomain ||
    broker.package === "free"
  ) {
    return unchanged;
  }

  const existing = await brokerModel.findIdBySubdomain(change.subdomain);
  if (existing && existing.id !== broker.id) {
    return unchanged;
  }

  try {
    const updated = await brokerModel.update(broker.id, {
      subdomain: change.subdomain,
    });
    return { subdomain: updated.subdomain, applied: true };
  } catch (error) {
    console.error("Failed to apply requested subdomain early:", error);
    return unchanged;
  }
}

/**
 * Apply a previously validated plan change now that it has been paid for.
 * Domain availability is re-checked because approval can happen long after the
 * receipt was uploaded.
 */
export async function applyPlanChange(
  brokerId,
  change,
  { billingAmount } = {},
) {
  const broker = await brokerModel.findById(brokerId);
  if (!broker) {
    throw Object.assign(new Error("Broker not found"), { status: 404 });
  }

  const plan = PLANS_BY_ID[change.package];
  if (!plan) {
    throw badRequest("Invalid plan selected");
  }

  const domainUpdates = {};

  if (change.domain_type === "custom" && plan.customDomain) {
    if (change.custom_domain !== broker.custom_domain) {
      const taken = await brokerModel.findByCustomDomain(change.custom_domain);
      if (taken && taken.id !== brokerId) {
        throw Object.assign(new Error("Custom domain already taken"), {
          status: 409,
          reason: "taken",
        });
      }
    }
    domainUpdates.domain_type = "custom";
    domainUpdates.custom_domain = change.custom_domain;
  } else {
    if (change.subdomain && change.subdomain !== broker.subdomain) {
      const existing = await brokerModel.findIdBySubdomain(change.subdomain);
      if (existing && existing.id !== brokerId) {
        throw Object.assign(new Error("Subdomain already taken"), {
          status: 409,
          reason: "taken",
        });
      }
      domainUpdates.subdomain = change.subdomain;
    }
    if (broker.domain_type !== "subdomain" || broker.custom_domain) {
      domainUpdates.domain_type = "subdomain";
      domainUpdates.custom_domain = null;
    }
  }

  if (Object.keys(domainUpdates).length > 0) {
    await brokerModel.update(brokerId, domainUpdates);
  }

  return activateSubscription(brokerId, {
    package: change.package,
    packageCategory: change.packageCategory,
    billingAmount,
  });
}
