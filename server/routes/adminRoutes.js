import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  getMe,
  getDashboardStats,
  listBrokers,
  getBrokerDetail,
  updateBrokerStatus,
} from "../controllers/adminController.js";
import {
  adminListSubmissions,
  adminReviewSubmission,
} from "../controllers/instapayController.js";

const router = Router();

// Every admin route requires a valid session AND a matching admin_users row.
router.use(requireAuth, requireAdmin);

router.get("/me", getMe);
router.get("/dashboard-stats", getDashboardStats);
router.get("/brokers", listBrokers);
router.get("/brokers/:brokerId", getBrokerDetail);
router.patch("/brokers/:brokerId/status", updateBrokerStatus);
router.get("/instapay", adminListSubmissions);
router.patch("/instapay/:id", adminReviewSubmission);

export default router;
