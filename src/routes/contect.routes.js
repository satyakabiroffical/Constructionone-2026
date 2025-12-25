import { Router } from "express";
const router = Router();

import {
createContect,
getAllContect,
getById,
toggle
} from '../controllers/contect.controller.js'

router.route('/contect')
    .post(createContect)
    .get(getAllContect)

router.route('/contect/:id')
    .get(getById)
    .patch(toggle)

export default router;