import { Router } from "express";
import {
  createPortfolio,
  deletePortfolio,
  getVendorPortfolios,
  updatePortfolio,
} from "../../controllers/serviceProvider/servicePortfolio.controller.js";
import { authMiddleware, vendorMiddleware } from "../../middlewares/auth.js";
import { s3Uploader } from "../../middlewares/uploads.js";

const router = Router();
router.post(
  "/create-portfolio",
  vendorMiddleware,
  s3Uploader().fields([{ name: "image", maxCount: 1 }]),
  createPortfolio,
);

router.get("/vendor-portfolio/:vendorId", getVendorPortfolios);

router.put(
  "/update-portfolio/:portfolioId",
  vendorMiddleware,
  s3Uploader().fields([{ name: "image", maxCount: 1 }]),
  updatePortfolio,
);
router.delete(
  "/delete-portfolio/:portfolioId",
  vendorMiddleware,
  deletePortfolio,
);
export default router;
