import { Router } from "express";
import { vendorMiddleware, adminMiddleware } from "../../middlewares/auth.js";
import {
  requestWithdraw,
  approveWithdraw,
  rejectWithdraw,
  getAllWithdrawalRequests,
} from "../../controllers/vendorShop/vendorWithdrawalBalance.controller.js";
const router = Router();

//vendor
router.post("/withdrawals", vendorMiddleware, requestWithdraw);

//admin - API'S
router.get("/withdrawals", adminMiddleware, getAllWithdrawalRequests);
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
export default router;

// GET /admin/withdrawals
//GET /admin/withdrawals?page=1&limit=20
//GET /admin/withdrawals?status=PENDING
