import { PLANS } from "../config/plans.js";

/**
 * GET /api/plans
 * Public — returns the subscription plan catalog used by the plan-selection
 * step after registration.
 */
export const listPlans = (req, res) => {
  res.json({ status: "success", plans: PLANS });
};
