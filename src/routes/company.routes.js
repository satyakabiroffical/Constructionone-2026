import { Router } from "express";

import {
  getCompany,
  updateCompany,
} from "../controllers/company.controller.js";

const router = Router();

router.route("/company")
  .get(getCompany)
  .patch(updateCompany);

export default router;
