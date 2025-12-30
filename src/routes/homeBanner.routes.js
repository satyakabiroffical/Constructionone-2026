import { Router } from "express";
import { s3Uploader } from "../middleware/uploads.js";
import {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
} from "../controllers/homeBanner.controller.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

const router = Router();

router.post(
  "/homeBanner",authMiddleware,isAdmin,
  s3Uploader().fields([{ name: "bannerImg", maxCount: 5 }]),
  createBanner
);

router.get("/homeBanner", getAllBanners);
router.get("/homeBanner/:id", getBannerById);

router.put(
  "/homeBanner/:id",authMiddleware,isAdmin,
  s3Uploader().fields([{ name: "bannerImg", maxCount: 5 }]),
  updateBanner
);

router.patch("/homeBanner/:id/disable",authMiddleware,isAdmin, toggleBannerStatus);
router.delete("/homeBanner/:id",authMiddleware,isAdmin, deleteBanner);

export default router;
