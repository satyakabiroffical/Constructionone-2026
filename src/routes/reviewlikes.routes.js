import { Router } from "express";
import {
  getReviewLikesCount,
  createLike,
} from "../controllers/reviewLikes.controller.js";
import authMiddleWare from "../middleware/auth.js";

const router = Router();
router.route("/reviewlikes/:reviewId").get(authMiddleWare, getReviewLikesCount);
router.route("/reviewlikes/:reviewId").patch(authMiddleWare, createLike);

export default router;
