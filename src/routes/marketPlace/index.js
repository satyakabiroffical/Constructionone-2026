import { Router } from "express";
import productRoutes from "./product.routes.js";
import categoryRoutes from "./category.routes.js";
import orderRoutes from "./order.routes.js";

const router = Router();

router.use("/product", productRoutes);
router.use("/category", categoryRoutes);
router.use("/order", orderRoutes);

export default router;
