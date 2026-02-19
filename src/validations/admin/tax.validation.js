import { body, param } from "express-validator";   // priyanshu
import { validateObjectId } from "../../middlewares/validation.js";

export const taxValidation = {
    createTax: [
        body("percentage")
            .notEmpty()
            .withMessage("Percentage is required")
            .isFloat({ min: 0, max: 100 })
            .withMessage("Percentage must be a number between 0 and 100"),
    ],

    updateTax: [
        param("id").custom(validateObjectId).withMessage("Invalid Tax ID"),
        body("percentage")
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage("Percentage must be a number between 0 and 100"),
    ],

    getTaxById: [
        param("id").custom(validateObjectId).withMessage("Invalid Tax ID"),
    ],

    deleteTax: [
        param("id").custom(validateObjectId).withMessage("Invalid Tax ID"),
    ],
};
