import { Router } from "express";
import {
  checkEmail,
  completeRegistration,
  login,
} from "../controllers/authController.js";

const router = Router();

router.get("/check-email", checkEmail);
router.post("/complete-registration", completeRegistration);
router.post("/login", login);

export default router;
