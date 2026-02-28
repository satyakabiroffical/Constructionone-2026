import { Router } from "express";
import {
    submitReturnRequest,
    vendorReviewReturn,
    performQC,
    getUserReturnRequests,
    getVendorReturnRequests,
} from "../../controllers/marketPlace/returnRequest.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/:orderId", requireAuth, submitReturnRequest);

router.get("/my", requireAuth, getUserReturnRequests);

router.get("/vendor", requireAuth, getVendorReturnRequests);

router.put("/:returnId/review", requireAuth, vendorReviewReturn);

router.put("/:returnId/qc", requireAuth, performQC);

export default router;