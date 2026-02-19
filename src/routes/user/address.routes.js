//asgr                 //priyanshu
import { Router } from "express";
import {
  createAddress,
  getAddressesByUser,
  updateAddress,
  deleteAddress,
} from "../../controllers/user/address.controller.js";
import { addressValidation } from "../../validations/auth/address.validation.js";
import { validateRequest } from "../../middlewares/validation.js";

const router = Router();

router.post("/", validateRequest(addressValidation.createAddress), createAddress);
router.get("/:userId", validateRequest(addressValidation.userId), getAddressesByUser);
router.put("/:id", validateRequest(addressValidation.updateAddress), updateAddress);
router.delete("/:id", validateRequest(addressValidation.addressId), deleteAddress);

export default router;
