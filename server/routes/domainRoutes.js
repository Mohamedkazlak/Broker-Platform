import { Router } from "express";
import {
  checkCustomDomain,
  listCustomDomainTlds,
} from "../controllers/domainController.js";

const router = Router();

// Public catalog of every TLD name.com sells, with 1-year list prices.
router.get("/tlds", listCustomDomainTlds);

// Public, advisory-only availability + live wholesale price check.
router.get("/check-custom", checkCustomDomain);

export default router;
