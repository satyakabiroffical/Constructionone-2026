import { Router } from "express";

import { s3Uploader } from "../middleware/uploads.js";

import {
  createBrand,
  toggle,
  updateBrand,
  getAllBrands,
  getBySlug,
  getById,
} from "../controllers/brand.controller.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

const router = Router();

router
  .route("/brands")
  .post(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([{ name: "brandImage", maxCount: 1 }]),
    createBrand
  )
  .get(getAllBrands);

router
  .route("/brands/:id")
  .put(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([{ name: "brandImage", maxCount: 1 }]),
    updateBrand
  )
  .patch(authMiddleware, isAdmin, toggle)
  .get(getById);

router.route("/brands/slug/:slug").get(getBySlug);

export default router;
