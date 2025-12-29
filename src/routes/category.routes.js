import { Router } from "express";

import {
  createCategory,
  updateCategory,
  getAllCategory,
  toggle,
} from "../controllers/category.controller.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { s3Uploader } from "../middleware/uploads.js";

const router = Router();

router
  .route("/categories")
  .post(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([
      { name: "categoryIcon", maxCount: 1 },
      { name: "categoryImage", maxCount: 1 },
    ]),
    createCategory
  )
  .get(getAllCategory);

router
  .route("/categories/:id")
  .put(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([
      { name: "categoryIcon", maxCount: 1 },
      { name: "categoryImage", maxCount: 1 },
    ]),
    updateCategory
  )
  .patch(toggle);

export default router;
