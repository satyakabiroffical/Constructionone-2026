import { Router } from "express";
import { createfAQ } from "../controllers/fAQ.controller.js";

const router = Router();

router.route("/fAQ").post(createfAQ);

export default router;
