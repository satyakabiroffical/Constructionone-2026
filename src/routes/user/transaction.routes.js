// src/routes/transaction.routes.js // priyanshu

import express from "express";
import {
  getAllTransactions,
  getTransactionById,
  getTransactionsByUserId
} from "../../controllers/user/transaction.controller.js";

const router = express.Router();

router.get("/user/:userId", getTransactionsByUserId);
router.get("/:id", getTransactionById);
router.get("/", getAllTransactions);

export default router;
