import { Router } from "express";
const router = Router();
import vendorRoutes from "./vendor.routes.js";
import shoptiming from "./shoptiming.routes.js";

router.use("/vendor", vendorRoutes);
router.use("/vendor", shoptiming);

export default router;
