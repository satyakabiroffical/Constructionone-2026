import express from "express";

import {
  createAbout,
  getAllAbouts,
  getAboutById,
  updateAbout,
  deleteAbout,
  getAllAboutsVendorView,
} from "../../controllers/vendorShop/vendorAbout.controller.js";

import { vendorMiddleware, authMiddleware } from "../../middlewares/auth.js";

const router = express.Router();
router.post("/", vendorMiddleware, createAbout);
router.get("/", vendorMiddleware, getAllAboutsVendorView);
router.get("/:vendorId", authMiddleware, getAllAbouts);
router.get("/:id", getAboutById);

router.put("/:id", vendorMiddleware, updateAbout);

router.delete("/:id", vendorMiddleware, deleteAbout);

export default router;
