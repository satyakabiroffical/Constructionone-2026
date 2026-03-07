import { Router } from "express";
import {
  getAllSlots,
  createSlot,
  updateSlot,
  toggleSlotStatus,
  deleteSlot,
} from "../../controllers/serviceProvider/serviceSlot.controller.js";
import { authMiddleware, vendorMiddleware } from "../../middlewares/auth.js";

const router = Router();

router.post("/", vendorMiddleware, createSlot);
router.put("/:id", vendorMiddleware, updateSlot);
router.get("/", authMiddleware, getAllSlots); //users
router.patch("/:id", vendorMiddleware, toggleSlotStatus);
router.delete("/:id", vendorMiddleware, deleteSlot);
router.patch("/:id/toggle-status", vendorMiddleware, toggleSlotStatus);
export default router;
