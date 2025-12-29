import { Router } from "express";

import {
  createProduct,
  updateProduct,
  toggleProduct,
  getProduct,
  getAllProducts,
  getByPCategory,
  getByCategory,
  getByBrands
} from "../controllers/product.controller.js";
import {s3Uploader} from "../middleware/uploads.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

const router = Router();

router
  .route("/products")
  .post(authMiddleware, isAdmin , s3Uploader().fields([{ name: "images", maxCount: 5 }]),createProduct)
  .get(getAllProducts);

router
  .route("/products/:id")
  .put(authMiddleware, isAdmin ,s3Uploader().fields([{ name: "images", maxCount: 5 }]),updateProduct)
  .patch(authMiddleware, isAdmin ,toggleProduct)
  .get(getProduct)  

router
  .route("/products/pcategory/:id")
  .get(getByPCategory)

router
  .route("/products/category/:id")
  .get(getByCategory)

router
  .route("/products/brand/:id")
  .get(getByBrands)

export default router;
