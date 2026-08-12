import { Router } from "express";
import {
  getAccount,
  submitReceipt,
  getStatus,
  getMySubmission,
} from "../controllers/instapayController.js";

const router = Router();

router.get("/account", getAccount);
// Public for deferred signup (draft + claim token). Existing brokers may
// also call submit-receipt with a Bearer token (optional).
router.post("/submit-receipt", submitReceipt);
router.get("/status", getStatus);
// Requires a Bearer token — resolved inside the handler, same as submit-receipt.
router.get("/my-submission", getMySubmission);

export default router;
