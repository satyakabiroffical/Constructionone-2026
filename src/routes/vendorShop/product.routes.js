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

// GET top selling products (must be BEFORE /product/:id to avoid wildcard conflict)
router.get("/products/top-selling", authMiddleware, ProductController.getTopSellingProducts);

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

router.get("/product/:id", requireAuth, ProductController.getProductById);
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

// FLASH SALE routes
router.post("/products/:productId/flash-sale", vendorMiddleware, ProductController.setFlashSale);
router.patch("/products/:productId/flash-sale/cancel", vendorMiddleware, ProductController.cancelFlashSale);
router.get("/products/flash-sale", authMiddleware, ProductController.getFlashSaleProducts);

export default router;
