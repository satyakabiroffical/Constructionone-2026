import { Router } from "express";

import { s3Uploader } from "../middleware/uploads.js";

import{
createBrand,
    toggle,
updateBrand,
getAllBrands,
getBySlug,
getById,
} from "../controllers/brand.controller.js";

const router = Router();

router.route('/brands')
    .post(s3Uploader().fields([{ name: "brandImage", maxCount: 1 }]),createBrand)
    .get(getAllBrands)

router.route('/brands/:id')
    .put( s3Uploader().fields([{ name: "brandImage", maxCount: 1 }]), updateBrand)
    .patch(toggle)
    .get(getById)

router.route('/brands/:slug')
    .get(getBySlug)




export default router;