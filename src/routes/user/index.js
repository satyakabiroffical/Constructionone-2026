import { Router } from 'express';
import userRoutes from './user.routes.js';
import addressRoutes from "./address.routes.js";
import cartRoutes from "./cart.routes.js";
import wishlistRoutes from "./wishlist.routes.js";

const router = Router();

router.use('/users', userRoutes);
router.use("/address", addressRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
export default router;
