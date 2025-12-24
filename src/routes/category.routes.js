import { Router } from "express";

import {
    createCategory,
    updateCategory,
    getAllCategory,
    toggle,
    } from "../controllers/category.controller.js";


const router = Router();

router.route('/categories')
    .post(createCategory)
    .get(getAllCategory);

router.route('/categories/:id')
    .put(updateCategory)
    .patch(toggle)
    
export default router;