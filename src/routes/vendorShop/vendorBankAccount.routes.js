import { Router } from "express";
import {
  addBankAccount,
  getVendorBankAccounts,
  deleteBankAccount,
  setDefaultBankAccount,
  updateBankAccount,
} from "../../controllers/vendorShop/vendorBankAccount.controller.js";

// validators

import {
  validateAddBankAccount,
  validateSetDefaultBank,
  validateDeleteBank,
  validateUpdateBankAccount,
} from "../../validations/vendorShop/vendorBank.validation.js";

import validate from "../../middlewares/joiValidation.js"; //
import { vendorMiddleware, authMiddleware } from "../../middlewares/auth.js";
import { s3Uploader } from "../../middlewares/uploads.js";
const router = Router();

router.post(
  "/add",
  vendorMiddleware,
  s3Uploader().fields([{ name: "cancelledCheque", maxCount: 1 }]),
  validate(validateAddBankAccount),
  addBankAccount,
);

router.get("/list", vendorMiddleware, getVendorBankAccounts);

router.post(
  "/set-default",
  validate(validateSetDefaultBank),
  setDefaultBankAccount,
);

router.put(
  "/update/:id",
  vendorMiddleware,
  s3Uploader().fields([{ name: "cancelledCheque", maxCount: 1 }]),
  validate(validateUpdateBankAccount),
  updateBankAccount,
);

router.delete(
  "/delete/:id",
  vendorMiddleware,
  deleteBankAccount,
);

export default router;
//nibu-refToken : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTBiYTM3ZTBkZTk3MzBlZDkyNzM1MSIsImlhdCI6MTc3NjMzOTc4MCwiZXhwIjoxNzc4OTMxNzgwfQ.8XHS1zfg5esRQDDXL8ihW5ZIyUrI4Vy1nR5Ic5eik9U
