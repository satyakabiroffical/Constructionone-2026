import { Router } from "express";
const router = Router();
import authMiddleware from "../middleware/auth.js";
import {
  UploadSocialMediaPhotos,
  getSocialMediaUrls,
  removeSocialMediaPhoto,
  toggleSocialMediaStatus,
} from "../controllers/socialmedia.controllers.js";
import { isAdmin } from "../middleware/role.js";

router
  .route("/socialmedia", authMiddleware, isAdmin)
  .post(UploadSocialMediaPhotos)
  .get(getSocialMediaUrls);

router
  .route("/socialmedia/:postid", authMiddleware, isAdmin)
  .patch(toggleSocialMediaStatus)
  .delete(removeSocialMediaPhoto);

export default router;
