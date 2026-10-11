import { Router } from "express";
import { resolveHost } from "../controllers/customDomainResolveController.js";

const router = Router();

router.get("/resolve", resolveHost);

export default router;
