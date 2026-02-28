import { body, param } from "express-validator"; //priyanshu
import { validateObjectId } from "../../middlewares/validation.js";

export const addressValidation = {


  createAddress: [

    body("userId")
      .notEmpty()
      .withMessage("User ID is required")
      .custom(validateObjectId)
      .withMessage("Invalid user ID"),

    body("userName")
      .trim()
      .notEmpty()
      .withMessage("User name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("User name must be between 2 and 50 characters")
      .escape(),

    body("label")
      .optional()
      .isIn(["HOME", "OFFICE", "OTHER"])
      .withMessage("Label must be HOME, OFFICE or OTHER"),

    body("addressLine")
      .trim()
      .notEmpty()
      .withMessage("Address line is required")
      .isLength({ max: 200 })
      .withMessage("Address must be less than 200 characters")
      .escape(),

    body("city")
      .trim()
      .notEmpty()
      .withMessage("City is required")
      .isLength({ max: 50 })
      .withMessage("City must be less than 50 characters")
      .escape(),

    body("country")
      .trim()
      .notEmpty()
      .withMessage("Country is required")
      .isLength({ max: 50 })
      .withMessage("Country must be less than 50 characters")
      .escape(),

    body("location.lat")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),

    body("location.lng")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),

    body("landMark")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Landmark must be less than 100 characters")
      .escape(),
  ],


  updateAddress: [

    param("id")
      .custom(validateObjectId)
      .withMessage("Invalid address ID"),

    body("userName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("User name must be between 2 and 50 characters")
      .escape(),

    body("label")
      .optional()
      .isIn(["HOME", "OFFICE", "OTHER"])
      .withMessage("Label must be HOME, OFFICE or OTHER"),

    body("addressLine")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Address must be less than 200 characters")
      .escape(),

    body("city")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("City must be less than 50 characters")
      .escape(),

    body("country")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Country must be less than 50 characters")
      .escape(),

    body("location.lat")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Latitude must be between -90 and 90"),

    body("location.lng")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Longitude must be between -180 and 180"),

    body("landMark")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Landmark must be less than 100 characters")
      .escape(),
  ],


  // =====================================================
  // 🔹 Address ID Validation
  // =====================================================

  addressId: [
    param("id")
      .custom(validateObjectId)
      .withMessage("Invalid address ID"),
  ],

  // =====================================================
  // 🔹 User ID Validation
  // =====================================================

  userId: [
    param("userId")
      .custom(validateObjectId)
      .withMessage("Invalid user ID"),
  ],
};

export default addressValidation;
