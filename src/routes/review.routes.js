import { Router } from "express";
import {
  addReview,
  deleteReview,
  updateReview,
  getReview,
  getAllReview,
} from "../controllers/review.controller.js";

const router = Router();
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

router.route("/review").post(authMiddleware, addReview);
router
  .route("/review/:reviewId")
  .delete(authMiddleware, deleteReview)
  .put(authMiddleware, updateReview)
  .get(getReview);

// admin all route
router.route("/review/:reviewId").delete(authMiddleware, isAdmin, deleteReview);
router.route("/getAllReview").get(authMiddleware, isAdmin, getAllReview);

export default router;
