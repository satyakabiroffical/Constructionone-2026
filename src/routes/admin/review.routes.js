import { Router } from "express";  // priyuanshu
import {
    getAllReviews,
    updateReviewApproval,
} from "../../controllers/user/review.controller.js";

const router = Router();

// GET  /api/v1/admin/reviews               — all reviews (paginated, filterable)
router.get("/", getAllReviews);

// PATCH /api/v1/admin/reviews/:reviewId/approve — approve / reject a review
router.patch("/:reviewId", updateReviewApproval);

// DELETE /api/v1/admin/reviews/:reviewId   — hard delete a review
// router.delete("/:reviewId", deleteReview);

export default router;
