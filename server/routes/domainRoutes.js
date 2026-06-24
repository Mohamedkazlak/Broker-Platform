import { Router } from "express";
import { checkCustomDomain } from "../controllers/domainController.js";

const router = Router();

// Public, advisory-only availability check (mocked — no registrar call).
router.get("/check-custom", checkCustomDomain);

export default router;
