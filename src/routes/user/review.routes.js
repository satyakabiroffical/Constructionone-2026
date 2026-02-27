import { Router } from "express";  // priyanshu
import {
  addReview,
  getProductReviews,
} from "../../controllers/user/review.controller.js";
import { reviewValidation } from "../../validations/user/review.validation.js";
import { requireAuth } from "../../middlewares/auth.middleware.js"; // Assuming auth middleware exists
import { validateRequest } from "../../middlewares/validation.js"; // Assuming validation result middleware exists
import { s3Uploader } from "../../middlewares/uploads.js";

const router = Router();

// POST /api/v1/reviews  OR  /api/v1/reviews/addReview
const addReviewMiddlewares = [
  requireAuth,
  s3Uploader().fields([
    { name: "images", maxCount: 10 },
    { name: "reviewImages", maxCount: 10 }
  ]),
  validateRequest(reviewValidation.addReview),
  addReview
];

// router.post("/", ...addReviewMiddlewares);
router.post("/addReview", ...addReviewMiddlewares);


// GET /api/v1/user/reviews/:productId - Get reviews for a product (Public or Protected?)

// Usually public

router.get(
    "/:productId",
    validateRequest(reviewValidation.getReviews),
    getProductReviews
);

export default router;
