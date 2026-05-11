import { Router } from "express";
import { vendorMiddleware, adminMiddleware } from "../../middlewares/auth.js";
import {
  requestWithdraw,
  approveWithdraw,
  rejectWithdraw,
  getAllWithdrawalRequests,
  downloadStatementPDF,
  getAdminTransactionsHistory,
  getVendorWithdrawalRequests,
} from "../../controllers/vendorShop/vendorWithdrawalBalance.controller.js";
const router = Router();

//vendor
router.post("/withdrawals", vendorMiddleware, requestWithdraw);
router.get("/statement/pdf", vendorMiddleware, downloadStatementPDF);

//admin - API'S
router.get("/withdrawals", adminMiddleware, getAllWithdrawalRequests);
router.get(
  "/transactions/history",
  adminMiddleware,
  getAdminTransactionsHistory,
);
router.patch(
  "/withdrawals/approve/:withdrawalId",
  adminMiddleware,
  approveWithdraw,
);
router.patch(
  "/withdrawals/reject/:withdrawalId",
  adminMiddleware,
  rejectWithdraw,
);
router.get(
  "/withdrawals/history",
  vendorMiddleware,
  getVendorWithdrawalRequests,
);
export default router;

// GET /admin/withdrawals
//GET /admin/withdrawals?page=1&limit=20
//GET /admin/withdrawals?status=PENDING
