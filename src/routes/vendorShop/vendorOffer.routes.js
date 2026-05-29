import express from "express";
import { authMiddleware, vendorMiddleware } from "../../middlewares/auth.js";

const router = express.Router();

import {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  getAllOffersForVendor,
} from "../../controllers/vendorShop/vendorOffer.controller.js";

router.post("/", vendorMiddleware, createOffer);
router.get("/", vendorMiddleware, getAllOffersForVendor);

router.get("/:vendorId", authMiddleware, getAllOffers);

router.get("/:id", getOfferById);

router.put("/:id", vendorMiddleware, updateOffer);

router.delete("/:id", vendorMiddleware, deleteOffer);

export default router;
