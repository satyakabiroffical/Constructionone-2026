import { Router } from "express";

import {
  createpCategory,
  updatepCategory,
  getAllpCategory,
  toggle,
  getpCategory,
} from "../controllers/pcategory.controller.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { s3Uploader } from "../middleware/uploads.js";

const router = Router();

router
  .route("/pcategories")
  .post(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([
      { name: "categoryIcon", maxCount: 1 },
      { name: "categoryImage", maxCount: 1 },
    ]),
    createpCategory
  )
  .get(getAllpCategory);

router
  .route("/pcategories/:id")
  .put(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([
      { name: "categoryIcon", maxCount: 1 },
      { name: "categoryImage", maxCount: 1 },
    ]),
    updatepCategory
  )
  .patch(authMiddleware, isAdmin, toggle)
  .get(getpCategory);

export default router;
