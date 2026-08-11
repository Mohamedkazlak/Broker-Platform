import { Router } from "express";
import { checkout, getCheckoutStatus } from "../controllers/paymentController.js";

const router = Router();

// Public for the draft-signup path (no session yet); existing brokers call
// the same endpoint with a Bearer token — see resolveBrokerIdFromAuth.
router.post("/checkout", checkout);
router.get("/status", getCheckoutStatus);

export default router;
