import express from "express";

import {
  createShipment,
  logisticsWebhook,
  getOrderTracking,
} from "../../controllers/marketPlace/logistics.controller.js";

const router = express.Router();
// create shipment when vendor package ready
router.post("/create-shipment", createShipment);

// logistics company webhook for status update
router.post("/webhook", logisticsWebhook);

// user tracking api
router.get("/tracking/:orderId", getOrderTracking);

export default router;
