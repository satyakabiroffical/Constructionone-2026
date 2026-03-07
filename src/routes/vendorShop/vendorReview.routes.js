import express from "express";
import {
  addReview,
  getVendorReviews,
  markReviewHelpful,
  updateReview,
  deleteReview,
} from "../../controllers/vendorShop/vendorReview.controller.js";
import {
  adminMiddleware,
  vendorMiddleware,
  authMiddleware,
} from "../../middlewares/auth.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = express.Router();
import { s3Uploader } from "../../middlewares/uploads.js";

// s3Uploader().fields([{ name: "brandImage", maxCount: 1 }]),
// User writes / updates review
router.post(
  "/review",
  requireAuth,
  s3Uploader().fields([{ name: "images", maxCount: 5 }]),
  addReview,
);
router.put(
  "/review/:reviewId",
  requireAuth,
  s3Uploader().fields([{ name: "images", maxCount: 5 }]),
  updateReview,
);

//admin and vendor can delete review
router.put("/review/:reviewId", authMiddleware, deleteReview);

// Get vendor reviews (pagination)
router.get("/reviews/:vendorId", requireAuth, getVendorReviews);

// Helpful / Like
router.post("/review/:reviewId/helpful", requireAuth, markReviewHelpful);

export default router;
