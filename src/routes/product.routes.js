import { Router } from "express";

import {createProduct,
        updateProduct,
        toggleProduct,
        getProduct,
        getAllProducts,
    } from "../controllers/product.controller.js";


const router = Router();

router.route('/products')
    .post(createProduct)
    .get(getAllProducts);

router.route('/products/:id')
    .put(updateProduct)
    .patch(toggleProduct)
    .get(getProduct);



export default router;