import { Router } from "express";
import StateController from "../../controllers/admin/state.controller.js";


import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

// Base: /api/v1/material

router.get("/states", requireAuth, StateController.getStates);
router.get("/states/:id", requireAuth, StateController.getState);

router.post(
  "/states",
  requireAuth,
 
  StateController.createState,
);

router.patch(
  "/states/:id",
  requireAuth,
  
  StateController.updateState,
);

router.patch(
  "/states/:id/toggle-status",
  requireAuth,
  StateController.toggleStateStatus,
);

router.delete("/states/:id", requireAuth, StateController.deleteState);

export default router;
