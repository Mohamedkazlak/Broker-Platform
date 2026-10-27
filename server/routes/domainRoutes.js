import { Router } from "express";
import {
  checkCustomDomain,
  listCustomDomainTlds,
} from "../controllers/domainController.js";

const router = Router();

// Featured TLD catalog (same 50 the picker shows), with 1-year list prices.
router.get("/tlds", listCustomDomainTlds);

// Public, advisory-only availability + live wholesale price check.
router.get("/check-custom", checkCustomDomain);

export default router;
