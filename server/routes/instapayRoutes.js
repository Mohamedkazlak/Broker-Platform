import { Router } from "express";
import {
  getAccount,
  submitReceipt,
  getStatus,
} from "../controllers/instapayController.js";

const router = Router();

router.get("/account", getAccount);
// Public for deferred signup (draft + claim token). Existing brokers may
// also call submit-receipt with a Bearer token (optional).
router.post("/submit-receipt", submitReceipt);
router.get("/status", getStatus);

export default router;
