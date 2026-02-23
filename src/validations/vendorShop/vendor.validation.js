import { body } from "express-validator";

// Vendor Profile Validation
export const vendorProfileValidation = [
  body("firstName")
    .notEmpty()
    .isString()
    .withMessage("First name must be a string"),

  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string"),
  body("email").notEmpty().isEmail().withMessage("Invalid email"),
  body("governmentIdType")
    .notEmpty()
    .isIn(["Aadhar Card", "Voter ID", "Driving License", "Other"])
    .withMessage("Invalid government ID type"),

  body("governmentIdNumber")
    .notEmpty()
    .isString()
    .withMessage("Government ID number is required"),
];

//Vendor Company Validation
export const vendorCompanyValidation = [
  body("companyName")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isString()
    .withMessage("Company name must be a string"),

  body("companyType")
    .trim()
    .notEmpty()
    .withMessage("Company type is required")
    .isIn([
      "Private Limited",
      "Public Limited",
      "Partnership",
      "Proprietorship",
      "Other",
    ])
    .withMessage(
      "Invalid company type. Must be one of: Private Limited, Public Limited, Partnership, Proprietorship, Other",
    ),

  body("businessCategory")
    .trim()
    .notEmpty()
    .withMessage("Business category is required")
    .isIn(["Retail", "Wholesale", "E-commerce", "Production", "Other"])
    .withMessage(
      "Invalid business category. Must be one of: Retail, Wholesale, E-commerce, Production, Other",
    ),

  body("serviceArea.selectedStates")
    .notEmpty()
    .withMessage("Selected states are required")
    .customSanitizer((value) => {
      if (typeof value === "string") {
        return value.split(",").map((v) => v.trim());
      }
      return value;
    })
    .isArray({ min: 1 })
    .withMessage("Selected states must be an array"),

  body("serviceArea.selectedCities")
    .notEmpty()
    .withMessage("Selected cities are required")
    .customSanitizer((value) => {
      if (typeof value === "string") {
        return value.split(",").map((v) => v.trim());
      }
      return value;
    })
    .isArray({ min: 1 })
    .withMessage("Selected cities must be an array"),

  body("serviceArea.PinCodes")
    .notEmpty()
    .withMessage("PinCodes are required")
    .customSanitizer((value) => {
      if (typeof value === "string") {
        return value.split(",").map((v) => v.trim());
      }
      return value;
    })
    .isArray({ min: 1 })
    .withMessage("PinCodes must be an array"),

  body("companyRegistrationNumber")
    .trim()
    .notEmpty()
    .withMessage("Company registration number is required")
    .isString()
    .withMessage("Company registration number must be a string"),

  body("businessAddress.address")
    .trim()
    .notEmpty()
    .withMessage("Business address is required")
    .isString()
    .withMessage("Business address must be a string"),

  body("businessAddress.city")
    .optional()
    .isString()
    .withMessage("City must be a string"),

  body("businessAddress.state")
    .optional()
    .isString()
    .withMessage("State must be a string"),

  body("businessAddress.country")
    .optional()
    .isString()
    .withMessage("Country must be a string"),

  body("businessAddress.latitude")
    .optional()
    .isFloat()
    .withMessage("Latitude must be a valid float number"),

  body("businessAddress.longitude")
    .optional()
    .isFloat()
    .withMessage("Longitude must be a valid float number"),

  body("gstNumber")
    .optional()
    .isString()
    .withMessage("GST number must be a string")
    .isLength({ min: 15, max: 15 })
    .withMessage("GST number must be exactly 15 characters"),

  body("contactNumber")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Invalid Indian contact number"),

  body("companyWebsiteURl")
    .optional()
    .isURL()
    .withMessage("Invalid website URL"),

  body("accountHolderName")
    .optional()
    .isString()
    .withMessage("Account holder name must be a string"),

  body("bankName")
    .trim()
    .notEmpty()
    .withMessage("Bank name is required")
    .isString()
    .withMessage("Bank name must be a string"),

  body("accountNumber")
    .trim()
    .notEmpty()
    .withMessage("Account number is required")
    .isNumeric()
    .withMessage("Account number must be numeric")
    .isLength({ min: 9, max: 18 })
    .withMessage("Account number must be between 9 to 18 digits"),

  body("confirmAccountNumber")
    .trim()
    .notEmpty()
    .withMessage("Confirm account number is required")
    .custom((value, { req }) => {
      if (!req.body.accountNumber) {
        throw new Error("Account number is missing");
      }
      if (value !== req.body.accountNumber) {
        throw new Error("Account numbers do not match");
      }
      return true;
    }),

  body("ifscCode")
    .optional()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage("Invalid IFSC code format (e.g. SBIN0123456)"),

  body("accountType")
    .trim()
    .notEmpty()
    .withMessage("Account type is required")
    .isIn(["Saving", "Current", "NRO", "NRE", "Other"])
    .withMessage(
      "Invalid account type. Must be one of: Saving, Current, NRO, NRE, Other",
    ),

  body("upiId")
    .optional()
    .matches(/^[\w.-]+@[\w.-]+$/)
    .withMessage("Invalid UPI ID format (e.g. name@upi)"),
];
