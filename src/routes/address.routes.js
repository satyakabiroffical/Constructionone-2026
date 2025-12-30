import { Router } from "express";

import { createAddress,updateAddress,getAllAddress,getAddress} from '../controllers/address.controller.js';
import authMiddleware from "../middleware/auth.js";

const router = Router();
router.route('/address')
    .post(authMiddleware,createAddress)
    .get(authMiddleware,getAllAddress)

router.route('/address/:id')
    .put(authMiddleware,updateAddress)
    .get(authMiddleware,getAddress)


export default router;
