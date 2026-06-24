import { Router } from "express";

const router = Router();

/**
 * POST /api/webhooks/paymob
 *
 * TODO: Implement when wiring Paymob.
 * This route must:
 *   1. Verify the HMAC signature from Paymob
 *   2. Parse the transaction result
 *   3. Call activateSubscription() on success
 *   4. Return 200 immediately (Paymob retries on non-200)
 *
 * Must be public (no requireAuth) — Paymob calls this, not the browser.
 * Must be registered BEFORE body-parser JSON middleware, or use express.raw()
 * so the raw body is available for HMAC verification.
 */
router.post("/paymob", (req, res) => {
  // TODO: implement
  res.status(501).json({ error: "Paymob webhook not yet implemented" });
});

export default router;
