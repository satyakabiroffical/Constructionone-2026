import { Router } from "express";
import ProductController from "../../controllers/vendorShop/product.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { createProductWithVariantSchema } from "../../validations/product.validation.js";
import { s3Uploader } from "../../middlewares/uploads.js";
import { authMiddleware, vendorMiddleware } from "../../middlewares/auth.js";
const router = Router();

// Base: /api/v1/material/products
router.get("/products", authMiddleware, ProductController.getProducts);

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

router.put(
  "/updateProduct/:id",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  ProductController.updateProduct,
);

router.patch(
  "/disableProduct/:id",
  vendorMiddleware,
  ProductController.disableProduct,
);

router.patch(
  "/verifyProduct/:id",
  vendorMiddleware,
  ProductController.verifyProduct,
);

router.get("/product/:id", vendorMiddleware, ProductController.getProductById);
export default router;
