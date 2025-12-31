import { Router } from "express";
const router = Router();

import {
  createContact,
  getAllContact,
  getById,
  toggle,
} from "../controllers/contact.controller.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

router
  .route("/contact")
  .post(createContact)
  .get(authMiddleware, isAdmin, getAllContact);

router
  .route("/contact/:id")
  .get(authMiddleware, isAdmin, getById)
  .patch(authMiddleware, isAdmin, toggle);

export default router;
