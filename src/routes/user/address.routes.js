//asgr
import { Router } from "express";
import {
  createAddress,
  getAddressesByUser,
  updateAddress,
  deleteAddress,
} from "../../controllers/user/address.controller.js";

const router = Router();

router.post("/", createAddress);
router.get("/:userId", getAddressesByUser);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

export default router;
