/**
 * Written by Pradeep
 */
import { Router } from "express";
import { getMyReferrals, getReferralStats } from "../../controllers/referral/referral.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/my", requireAuth, getMyReferrals);
router.get("/stats", requireAuth, getReferralStats);

export default router;
