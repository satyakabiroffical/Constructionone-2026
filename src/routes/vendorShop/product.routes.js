import { Router } from "express";
import ProductController from "../../controllers/vendorShop/product.controller.js";
import validate from "../../middlewares/joiValidation.js";
import { createProductWithVariantSchema } from "../../validations/product.validation.js";
import { s3Uploader } from "../../middlewares/uploads.js";
import {
  authMiddleware,
  vendorMiddleware,
  adminMiddleware,
} from "../../middlewares/auth.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get(
  "/draft/products",
  vendorMiddleware,
  ProductController.getDraftProducts,
);
router.put(
  "/draft/products/:id",
  vendorMiddleware,
  ProductController.updateProductStatus,
);
// Base: /v1/material/products
// GET all products — any authenticated user/admin/vendor
router.get("/products", authMiddleware, ProductController.getProducts);
router.get(
  "/products/admin",
  adminMiddleware,
  ProductController.getAllProductsAdmin,
);
router.get(
  "/products/admin/vendor/:vendorId",
  adminMiddleware,
  ProductController.getProductsByVendorId,
);

//getProductBySubCategory vendor products
router.get(
  "/product/subcategory/:subcategoryId",
  authMiddleware,
  ProductController.getProductBySubCategory,
);
router.get(
  "/product/vendorshop/:vendorId/brand/:brandId",
  authMiddleware,
  ProductController.getProductByVendorBrand,
);

// GET top selling products (must be BEFORE /product/:id to avoid wildcard conflict)
router.get(
  "/products/top-selling",
  authMiddleware,
  ProductController.getTopSellingProducts,
);
router.get(
  "/product/hot-deals",
  authMiddleware,
  ProductController.getDailyHotDeals,
);

// CREATE product with variants (vendor only)
router.post(
  "/addProducts",
  vendorMiddleware,
  s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  ProductController.parseFormDataJSON,
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
router.get("/product/suggestions/:slug", ProductController.getProductsBySlug);

router.get(
  "/product/:productId/variants",
  requireAuth,
  ProductController.getProductVariants,
);

router.get(
  "/products/category/:categoryId",
  ProductController.getProductByCategory,
);
// DISABLE / ENABLE product (vendor only)

router.patch(
  "/disableProduct/:id",
  adminMiddleware,
  ProductController.toggleProduct,
);

// VERIFY product (vendor only) admin
router.patch(
  "/verifyProduct/:id",
  adminMiddleware,
  ProductController.verifyProduct,
);

//get vendor products
router.get(
  "/product/vendorshop/:vendorId",
  authMiddleware,
  ProductController.getVendorProducts,
);
router.get(
  "/product/brand/:brandId",
  authMiddleware,
  ProductController.getProductsByBrand,
);

export default router;
