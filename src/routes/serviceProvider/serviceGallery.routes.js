//asgr
import { Router } from "express";
import {
  getGalleryByVendorId,
  addImages,
  deleteImages,
  getMyGallery,
  getAllVendorsGallery,
} from "../../controllers/serviceProvider/serviceGallery.controller.js";
import {
  adminMiddleware,
  authMiddleware,
  vendorMiddleware,
} from "../../middlewares/auth.js";
import { s3Uploader } from "../../middlewares/uploads.js";
const router = Router();

router.get("/gallery/images/:vendorId", authMiddleware, getGalleryByVendorId);
router.delete("/gallery/images", vendorMiddleware, deleteImages);
router.get("/vendor/gallery", vendorMiddleware, getMyGallery); // vendor
router.get("/admin/gallery", adminMiddleware, getAllVendorsGallery); // admin-all vendors

router.post(
  "/gallery/images",
  vendorMiddleware,
  s3Uploader().fields([{ name: "images", maxCount: 10 }]),
  addImages,
);

export default router;


//asgr