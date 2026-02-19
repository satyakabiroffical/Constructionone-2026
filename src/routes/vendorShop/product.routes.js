import { Router } from "express";
import ProductController from "../../controllers/vendorShop/product.controller.js";
import validate from "../../middleware/joiValidation.js";
import {
  createProductWithVariantSchema,
  
} from "../../validations/product.validation.js";
import { s3Uploader } from "../../middleware/uploads.js";


const router = Router();

// Base: /api/v1/material/products

router.get("/products", ProductController.getProducts);

router.post(
  "/addProducts",
   s3Uploader().fields([
    { name: "images", maxCount: 5 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  validate(createProductWithVariantSchema), 
  ProductController.createProduct,
);




export default router;
