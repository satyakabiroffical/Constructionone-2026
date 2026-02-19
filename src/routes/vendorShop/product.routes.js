import { Router } from "express";
import ProductController from "../../controllers/vendorShop/product.controller.js";
import validate from "../../middlewares/joiValidation.js";
import {
  createProductWithVariantSchema,
  
} from "../../validations/product.validation.js";
import { s3Uploader } from "../../middlewares/uploads.js";

import { requireAuth } from "../../middlewares/auth.middleware.js";
const router = Router();

// Base: /api/v1/material/products

router.get("/products",requireAuth, ProductController.getProducts);

router.post(
  "/addProducts",
  requireAuth,
   s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  validate(createProductWithVariantSchema), 
  ProductController.createProduct,
);




export default router;
