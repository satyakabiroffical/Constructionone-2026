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

const router = Router();

router.post(
  "/homeBanner",
  s3Uploader().fields([{ name: "bannerImg", maxCount: 5 }]),
  createBanner
);

router.get("/homeBanner", getAllBanners);
router.get("/homeBanner/:id", getBannerById);

router.put(
  "/homeBanner/:id",
  s3Uploader().fields([{ name: "bannerImg", maxCount: 5 }]),
  updateBanner
);

router.patch("/homeBanner/:id/disable", toggleBannerStatus);
router.delete("/homeBanner/:id", deleteBanner);

export default router;
