import { Router } from "express";
import {
  addReview,
  getProductReviews,
} from "../../controllers/user/review.controller.js";
import { reviewValidation } from "../../validations/user/review.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js"; // Assuming auth middleware exists
import { validateRequest } from "../../middlewares/validation.js"; // Assuming validation result middleware exists

const router = Router();

// POST /api/v1/user/reviews - Add a review (Protected)
// router.post(
//     "/",
//     requireAuth,
//     validateRequest(reviewValidation.addReview),
//     addReview
// );

// GET /api/v1/user/reviews/:productId - Get reviews for a product (Public or Protected?)
// Usually public
// router.get(
//     "/:productId",
//     validateRequest(reviewValidation.getReviews),
//     getProductReviews
// );

export default router;
