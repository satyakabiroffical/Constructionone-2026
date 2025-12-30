import { Router } from "express";
import {
  createFAQ,
  deletefAQById,
  getAllfAQ,
  getfAQById,
  updatefAQById,
  toggle,
} from "../controllers/fAQ.controller.js";

import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";

const router = Router();

router.route("/fAQ").post(authMiddleware, isAdmin, createFAQ).get(getAllfAQ);
router
  .route("/fAQ/:faqId")
  .get(getfAQById)
  .put(authMiddleware, isAdmin, updatefAQById)
  .delete(authMiddleware, isAdmin, deletefAQById)
  .patch(authMiddleware, isAdmin, toggle);

export default router;
