import { Router } from "express"; 

import { createAddress,updateAddress} from '../controllers/address.controller.js';
import authMiddleware from "../middleware/auth.js";

const router = Router();
router.route('/address')
    .post(authMiddleware,createAddress)
    // .get(getAllBlogs);

router.route('/address/:id')
    .post(updateAddress)

export default router;