import { Router } from "express";
const router = Router();
import vendorRoutes from "./vendor.routes.js";
router.use("/vendor", vendorRoutes);

export default router;
