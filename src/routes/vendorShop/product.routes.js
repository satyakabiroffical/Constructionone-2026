import { Router } from "express";
import ProductController from "../../controllers/vendorShop/product.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { createProductWithVariantSchema } from "../../validations/product.validation.js";
import { s3Uploader } from "../../middlewares/uploads.js";
import { authMiddleware, vendorMiddleware } from "../../middlewares/auth.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Base: /v1/material/products

// GET all products — any authenticated user/admin/vendor
router.get("/products", authMiddleware, ProductController.getProducts);

// CREATE product with variants (vendor only)
router.post(
  "/addProducts",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  validate(createProductWithVariantSchema),
  ProductController.createProduct,
);

// UPDATE product (vendor only)
router.put(
  "/updateProduct/:id",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  ProductController.updateProduct,
);

// GET product variants (Sanvi's route — getProductVariants exists in controller now)
router.get(
  "/product/:productId/variants",
  requireAuth,
  ProductController.getProductVariants,
);

// DISABLE / ENABLE product (vendor only)
router.patch(
  "/disableProduct/:id",
  vendorMiddleware,
  ProductController.disableProduct,
);

// VERIFY product (vendor only)
router.patch(
  "/verifyProduct/:id",
  vendorMiddleware,
  ProductController.verifyProduct,
);

// GET single product by ID — ONCE only (removed duplicate)
router.get("/product/:id", requireAuth, ProductController.getProductById);

export default router;
