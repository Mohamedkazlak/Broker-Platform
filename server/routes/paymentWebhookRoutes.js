import { Router } from "express";
import express from "express";
import { handleWebhook } from "../controllers/paymentController.js";

const router = Router();

/**
 * POST /api/payments/webhook
 * payment.reachi.ai calls this — never the browser. Must stay public (no
 * requireAuth) and must receive the raw request body so the HMAC signature
 * can be verified against the exact bytes sent (hence express.raw() here
 * instead of relying on the app-wide express.json()).
 */
router.post("/", express.raw({ type: "application/json" }), handleWebhook);

export default router;
