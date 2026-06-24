import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireBroker } from "../middleware/requireBroker.js";
import {
  getBySubdomain,
  getById,
  update,
  checkSubdomainAvailability,
  selectPlan,
  getOrderSummary,
  simulatePayment,
} from "../controllers/brokerController.js";

const router = Router();

// Public routes — keep the static `/check-subdomain` path above `/:id` so it
// isn't swallowed by the id param matcher.
router.get("/check-subdomain", checkSubdomainAvailability);
router.get("/subdomain/:subdomain", getBySubdomain);

// Protected routes
router.get("/:id", requireAuth, requireBroker, getById);
router.patch("/:id", requireAuth, requireBroker, update);
router.post("/:id/select-plan", requireAuth, requireBroker, selectPlan);
router.get("/:id/order-summary", requireAuth, requireBroker, getOrderSummary);
router.post(
  "/:id/simulate-payment",
  requireAuth,
  requireBroker,
  simulatePayment,
);

export default router;
