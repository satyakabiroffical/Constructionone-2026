//asgr
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import {
  toggleShopOpenStatus,
  createShopTiming,
  deleteShopTimingByDay,
  getShopTimings,
} from "../../controllers/vendorShop/shoptiming.controller.js";

const router = Router();
router.put("/shop/timing", authMiddleware, createShopTiming);
router.get("/shop/timing", authMiddleware, getShopTimings);
router.patch("/shop/toggle", authMiddleware, toggleShopOpenStatus);
router.delete("/shop/timing/:day", authMiddleware, deleteShopTimingByDay);

export default router;
