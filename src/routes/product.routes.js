import { Router } from "express";

import {
  createProduct,
  updateProduct,
  toggleProduct,
  getProduct,
  getAllProducts,
  getSimilarProducts,
} from "../controllers/product.controller.js";
import { s3Uploader } from "../middleware/uploads.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

const router = Router();

router
  .route("/products")
  .post(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([{ name: "images", maxCount: 5 }]),
    createProduct
  )
  .get(getAllProducts);

router
  .route("/products/:id")
  .put(
    authMiddleware,
    isAdmin,
    s3Uploader().fields([{ name: "images", maxCount: 5 }]),
    updateProduct
  )
  .patch(authMiddleware, isAdmin, toggleProduct)
  .get(getProduct);
router.get("/products/:id/similar", getSimilarProducts);

export default router;
