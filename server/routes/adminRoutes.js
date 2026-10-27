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
import {
  adminListMessages,
  adminSetMessageRead,
  adminDeleteMessage,
} from "../controllers/contactController.js";
import {
  listDomainIssues,
  retryDns,
  retryRender,
  markDomainResolved,
  refundAndRevert,
} from "../controllers/adminDomainController.js";

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
router.get("/contact-messages", adminListMessages);
router.patch("/contact-messages/:id", adminSetMessageRead);
router.delete("/contact-messages/:id", adminDeleteMessage);

// Domain issues (Phase 5 actions; Phase 6 builds the admin UI)
router.get("/domains/issues", listDomainIssues);
router.post("/domains/:brokerId/retry-dns", retryDns);
router.post("/domains/:brokerId/retry-render", retryRender);
router.post("/domains/:brokerId/mark-resolved", markDomainResolved);
router.post("/domains/:brokerId/refund-revert", refundAndRevert);

export default router;
