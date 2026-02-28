import { Router } from "express";
import categoryRoutes from "./category.routes.js";
import orderRoutes from "./order.routes.js";
import returnRequestRoutes from "./returnRequest.routes.js";

const router = Router();

// router.use("/product", productRoutes);
router.use("/category", categoryRoutes);
router.use("/order", orderRoutes);
router.use("/return", returnRequestRoutes);

export default router;
