import { Router } from "express";
const router = Router();
import authMiddleware from "../middleware/auth";
import {
  UploadSocialMediaPhotos,
  removeSocialMediaPhoto,
} from "../controllers/socialmedia.controllers.js";
import { isAdmin } from "../middleware/role.js";

router
  .route("/socialmedia", authMiddleware, isAdmin)
  .post(UploadSocialMediaPhotos);
router
  .route("socialmedia/:postid", authMiddleware, isAdmin)
  .delete(removeSocialMediaPhoto);
