import { Router } from "express";


import {
    createpCategory,
    updatepCategory,
    getAllpCategory,
    toggle,
    getpCategory,
} from "../controllers/pcategory.controller.js";


const router = Router();

router.route('/pcategories')
    .post(createpCategory)
    .get(getAllpCategory)

router.route('/pcategories/:id')
    .put(updatepCategory)
    .patch(toggle)
    .get(getpCategory)

export default router;