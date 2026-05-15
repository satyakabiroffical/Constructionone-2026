import express from "express";
import {
  createMaintenance,
  getMaintenance,
  cancelMaintenance,
  getMaintenanceStatus,
} from "../../controllers/admin/appMaintenance.controller.js";
import { adminMiddleware } from "../../middlewares/auth.js";

const router = express.Router();
router.post("/maintenance", adminMiddleware, createMaintenance);
router.get("/maintenance", adminMiddleware, getMaintenance);
router.patch("/maintenance/:maintenanceId", adminMiddleware, cancelMaintenance);

export default router;

// {
//   "title": "Quick Test",
//   "description": "Auto ON/OFF test",
//   "startDateTime": "2026-05-13T11:32:00.000Z",
//   "endDateTime": "2026-05-13T11:34:00.000Z"
// }
