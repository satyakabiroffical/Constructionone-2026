import { body, param } from "express-validator";
import { validateObjectId } from "../../middlewares/validation.js"; // Assuming this exists based on example

export const reviewValidation = {
    addReview: [
        body("productId")
            .custom((value) => {
                if (!value.match(/^[0-9a-fA-F]{24}$/)) {
                    throw new Error("Invalid Product ID");
                }
                return true;
            })
            .withMessage("Invalid Product ID"),
        body("rating")
            .isInt({ min: 1, max: 5 })
            .withMessage("Rating must be between 1 and 5"),
        body("review")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage("Review cannot exceed 500 characters"),
        body("images")
            .optional()
            .isArray()
            .withMessage("Images must be an array of strings"),
    ],

    getReviews: [
        param("productId")
            .custom((value) => {
                if (!value.match(/^[0-9a-fA-F]{24}$/)) {
                    throw new Error("Invalid Product ID");
                }
                return true;
            })
            .withMessage("Invalid Product ID"),
    ],
};
