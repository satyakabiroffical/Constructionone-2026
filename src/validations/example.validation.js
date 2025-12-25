import { body, param } from "express-validator";
import { validateObjectId } from "../middleware/validation.js";

export const exampleValidation = {
  // Validation for creating an example
  createExample: [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Name must be between 3 and 50 characters")
      .escape(),

    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters")
      .escape(),

    body("status")
      .optional()
      .isIn(["active", "inactive", "pending"])
      .withMessage("Invalid status value"),

    body("priority")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Priority must be between 1 and 5"),

    body("tags")
      .optional()
      .isArray({ max: 10 })
      .withMessage("Maximum 10 tags allowed"),

    body("tags.*")
      .isString()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Each tag must be less than 20 characters")
      .escape(),
  ],

  // Validation for updating an example
  updateExample: [
    param("id").custom(validateObjectId).withMessage("Invalid example ID"),

    body("name")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Name must be between 3 and 50 characters")
      .escape(),

    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description must be less than 500 characters")
      .escape(),

    body("status")
      .optional()
      .isIn(["active", "inactive", "pending"])
      .withMessage("Invalid status value"),

    body("priority")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Priority must be between 1 and 5"),
  ],

  // Validation for example ID in params
  exampleId: [
    param("id").custom(validateObjectId).withMessage("Invalid example ID"),
  ],
};

export default exampleValidation;
