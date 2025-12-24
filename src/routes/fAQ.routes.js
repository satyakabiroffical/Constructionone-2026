import { Router } from "express";
import {
  createfAQ,
  deletefAQById,
  getAllfAQ,
  getfAQById,
  updatefAQById,
} from "../controllers/fAQ.controller.js";

const router = Router();

router.route("/fAQ").post(createfAQ).get(getAllfAQ);
router
  .route("/fAQ/:faqId")
  .get(getfAQById)
  .put(updatefAQById)
  .delete(deletefAQById);


export default router;
