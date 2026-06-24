import { Router } from "express";
import { listPlans } from "../controllers/planController.js";

const router = Router();

// Public route — the plan catalog is not tenant-specific.
router.get("/", listPlans);

export default router;
