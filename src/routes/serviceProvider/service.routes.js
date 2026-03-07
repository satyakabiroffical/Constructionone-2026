import { Router } from "express";
import {
  addService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getVendorServices,
  vendorServiceForUsers,
} from "../../controllers/serviceProvider/service.controller.js";
import {
  adminMiddleware,
  authMiddleware,
  vendorMiddleware,
} from "../../middlewares/auth.js";
import { s3Uploader } from "../../middlewares/uploads.js";
const router = Router();

router.post(
  "/",
  vendorMiddleware,
  s3Uploader().fields([{ name: "serviceImages", maxCount: 5 }]),
  addService,
);
router.get("/", vendorMiddleware, getVendorServices); //only vendor can see
router.put(
  "/:serviceId",
  vendorMiddleware,
  s3Uploader().fields([{ name: "serviceImages", maxCount: 5 }]),
  updateService,
);
router.delete("/:serviceId", vendorMiddleware, deleteService);

router.get("/:vendorId", authMiddleware, vendorServiceForUsers); //all customer's
//admin access
router.patch("/:serviceId/toggle-status", adminMiddleware, toggleServiceStatus);
export default router;
