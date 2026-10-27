import { Router } from "express";
import {
  checkCustomDomain,
  listCustomDomainTlds,
} from "../controllers/domainController.js";
import { customDomainCheckLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Featured TLD catalog (same 50 the picker shows), with 1-year list prices.
router.get("/tlds", listCustomDomainTlds);

// Public, advisory-only availability + live wholesale price check.
// Dedicated limiter on top of the general /api apiLimiter.
router.get("/check-custom", customDomainCheckLimiter, checkCustomDomain);

export default router;
