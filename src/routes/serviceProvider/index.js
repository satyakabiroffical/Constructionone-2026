import { Router } from "express";
import serviceProviderRoutes from "./serviceprovider.routes.js";
import serviceCategory from "./serviceCategory.routes.js";
import service from "./service.routes.js";
import serviceGallery from "./serviceGallery.routes.js";
import servicePackage from "./servicePackage.routes.js";
import servicePortfolio from "./servicePortfolio.routes.js";
import serviceReview from "./serviceReview.routes.js";
import aboutService from "./aboutService.routes.js";

const router = Router();

router.use("/service-providers", serviceProviderRoutes);
router.use("/service-categories", serviceCategory);
router.use("/service", servicePackage);
router.use("/service", service);
router.use("/service", serviceGallery);
router.use("/service", servicePortfolio);
router.use("/service", serviceReview);
router.use("/service", aboutService);

export default router;
