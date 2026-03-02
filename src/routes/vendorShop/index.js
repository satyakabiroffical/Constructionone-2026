import { Router } from "express";
const router = Router();
import vendorRoutes from "./vendor.routes.js";
import shoptiming from "./shoptiming.routes.js";
import vendorReview from "./vendorReview.routes.js";

router.use("/vendor", vendorRoutes);
router.use("/vendor", vendorReview);
router.use("/vendor", shoptiming);

export default router;

//asgr