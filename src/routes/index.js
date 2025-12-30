// src/routes/index.js
import { Router } from "express";
import exampleRoutes from "./example.routes.js";
import productRoutes from "./product.routes.js";
import categoryRoutes from "./category.routes.js";
import pcategoryRoutes from "./pcategory.routes.js";
import blogRoutes from "./blog.routes.js";
import brandRoutes from "./brand.routes.js";
import companyRoutes from "./company.routes.js";
import fAQRoutes from "./fAQ.routes.js";
import homeBannerRoutes from "./homeBanner.routes.js";
import contectRoutes from "./contect.routes.js";
import homeRoutes from "./home.routes.js";
import admin from "./admin.routes.js";
import auth from "./auth.routes.js";
import addressRoutes from "./address.routes.js";
import review from "./review.routes.js";
import cart from "./cart.routes.js";
import reviewlikes from "./reviewlikes.routes.js";
import orderRoutes from "./order.routes.js";
import socialMediaPhotoUrl from "./socialmedia.routes.js";
const router = Router();
// Mount routes

router.use("/v1", exampleRoutes);
router.use("/v1", productRoutes);
router.use("/v1", categoryRoutes);
router.use("/v1", pcategoryRoutes);
router.use("/v1", blogRoutes);
router.use("/v1", brandRoutes);
router.use("/v1", companyRoutes);
router.use("/v1", fAQRoutes);
router.use("/v1", homeBannerRoutes);
router.use('/v1', contectRoutes);
router.use('/v1', homeRoutes);
router.use('/v1', admin);
router.use('/v1', auth);
router.use('/v1', addressRoutes)
router.use("/v1", review);
router.use("/v1", reviewlikes);
router.use('/v1', orderRoutes);
router.use("/v1", cart);
router.use("/v1", socialMediaPhotoUrl);


export default router;
