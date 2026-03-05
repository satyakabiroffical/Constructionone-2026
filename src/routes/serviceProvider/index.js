import { Router } from "express";
import serviceProviderRoutes from "./serviceprovider.routes.js";
import serviceCategory from "./serviceCategory.routes.js";

const router = Router();

router.use("/service-providers", serviceProviderRoutes);
router.use("/service-categories", serviceCategory);

export default router;
