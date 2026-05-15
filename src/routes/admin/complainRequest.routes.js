import express from "express";

const router = express.Router();

import {
  createComplainRequest,
  getComplainRequests,
  deleteComplain,
  updateComplainStatus,
} from "../../controllers/admin/complainRequest.controller.js";

router.get("/complain-requests", getComplainRequests);
router.delete("/complain-requests/:complainId", deleteComplain);
router.put("/complain-requests/:complainId", updateComplainStatus);

export default router;
