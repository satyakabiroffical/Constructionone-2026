import { Router } from "express";
import RFQController from "../../controllers/vendorShop/rfq.controller.js";
import {
  authMiddleware,
  vendorMiddleware,
  adminMiddleware,
} from "../../middlewares/auth.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// USER — CREATE RFQ
router.post("/create", authMiddleware, RFQController.createRFQ);

// USER — VIEW THEIR RFQs
router.get("/rfq/user", authMiddleware, RFQController.getUserRFQs);

// GET SINGLE RFQ
router.get("/rfq/:id", authMiddleware, RFQController.getRFQById);

// VENDOR — VIEW THEIR RFQs
router.get(
  "/vendor",
  vendorMiddleware, // vendor auth
  RFQController.getVendorRFQs,
);

// ADMIN — VIEW ALL RFQs
router.get("/rfq/admin", adminMiddleware, RFQController.getAdminRFQs);

export default router;
