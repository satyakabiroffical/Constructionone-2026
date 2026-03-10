import { Router } from "express";
const router = Router();
import {
  createReview,
  getVendorReviews,
  updateReview,
  deleteReview,
  verifyReviewByAdmin,
} from "../../controllers/serviceProvider/serviceReview.controller.js";
import {
  adminMiddleware,
  authMiddleware,
  vendorMiddleware,
} from "../../middlewares/auth.js";
import { s3Uploader } from "../../middlewares/uploads.js";

router.post(
  "/create-review",
  authMiddleware,
  s3Uploader().fields([{ name: "images", maxCount: 5 }]),
  createReview,
);

router.get("/vendor-reviews/:vendorId", getVendorReviews);

router.put(
  "/update-review/:reviewId",
  authMiddleware,
  s3Uploader().fields([{ name: "images", maxCount: 5 }]),
  updateReview,
);

router.delete("/delete-review/:reviewId", authMiddleware, deleteReview);
router.put("/varified/:reviewId", adminMiddleware, verifyReviewByAdmin);

export default router;
