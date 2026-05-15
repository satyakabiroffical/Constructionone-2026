import { Router } from "express";
import StateController from "../../controllers/admin/state.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../../middlewares/role.middleware.js";
const router = Router();

// Base: /api/v1/material
router.get("/states", requireAuth, StateController.getStates);
router.get("/states/:id", requireAuth, StateController.getState);

router.post(
  "/states",
  requireAuth,
  requirePermission("COMMON_STATE"),
  StateController.createState,
);

router.put(
  "/states/:id",
  requireAuth,
requirePermission("COMMON_STATE"),
  StateController.updateState,
);

router.patch(
  "/states/:id/toggle-status",
  requireAuth,
  StateController.toggleStateStatus,
);
router.delete("/states/:id", requireAuth, StateController.deleteState);
export default router;
