import express from "express";

import {
  createAbout,
  getAllAbouts,
  getAboutById,
  updateAbout,
  deleteAbout,
} from "../../controllers/vendorShop/vendorAbout.controller.js";

import {vendorMiddleware ,authMiddleware} from "../../middlewares/auth.js";

const router = express.Router();
router.post("/", vendorMiddleware, createAbout);

router.get("/", vendorMiddleware, getAllAbouts);

router.get("/:id", getAboutById);

router.put("/:id", vendorMiddleware, updateAbout);

router.delete("/:id", vendorMiddleware, deleteAbout);

export default router;
