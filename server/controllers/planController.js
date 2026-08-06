import { PLANS, PACKAGE_CATEGORIES } from "../config/plans.js";

/**
 * GET /api/plans
 * Public — returns the subscription plan catalog used by the plan-selection
 * step after registration.
 *
 * `plans` stays a flat list (each entry carries its own `categories`) so
 * existing consumers keep working; `categories` gives clients the canonical
 * tab order without hardcoding it.
 */
export const listPlans = (req, res) => {
  res.json({
    status: "success",
    plans: PLANS,
    categories: PACKAGE_CATEGORIES,
  });
};
