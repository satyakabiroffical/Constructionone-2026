import { Router } from "express"; // priyanshu
import {
    createTax,
    getAllTaxes,
    getTaxById,
    updateTax,
    deleteTax,
    applyTaxToCompany,
} from "../../controllers/admin/tax.controller.js";
import { validateRequest } from "../../middlewares/validation.js";
import { taxValidation } from "../../validations/admin/tax.validation.js";

const router = Router();

router.post("/", validateRequest(taxValidation.createTax), createTax);
router.get("/taxes", getAllTaxes);

router.get("/:id", validateRequest(taxValidation.getTaxById), getTaxById);
router.put("/:id", validateRequest(taxValidation.updateTax), updateTax);
router.delete("/:id", validateRequest(taxValidation.deleteTax), deleteTax);
router.put("/:id/apply-company", validateRequest(taxValidation.getTaxById), applyTaxToCompany);

export default router;
