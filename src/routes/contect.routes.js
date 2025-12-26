import { Router } from "express";
const router = Router();

import {
  createContect,
  getAllContect,
  getById,
  toggle,
} from "../controllers/contect.controller.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

router
  .route("/contect")
  .post(createContect)
  .get(authMiddleware, isAdmin, getAllContect);

router
  .route("/contect/:id")
  .get(authMiddleware, isAdmin, getById)
  .patch(authMiddleware, isAdmin, toggle);

export default router;
