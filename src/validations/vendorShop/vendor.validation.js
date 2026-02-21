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
  body("vendorId").notEmpty().isMongoId().withMessage("Invalid vendor id"),
  body("companyName").trim().notEmpty().isString(),

  body("companyType")
    .trim()
    .notEmpty()
    .isIn([
      "Private Limited",
      "Public Limited",
      "Partnership",
      "Proprietorship",
      "Other",
    ]),

  body("businessCategory")
    .trim()
    .notEmpty()
    .isIn(["Retail", "Wholesale", "E-commerce", "Production", "Other"]),

  body("serviceArea.selectedStates").trim().notEmpty().isArray(),

  body("serviceArea.selectedCities").trim().notEmpty().isArray(),

  body("companyRegistrationNumber").trim().notEmpty().isString(),

  body("businessAddress.address").trim().notEmpty().isString(),

  body("businessAddress.city").optional().isString(),

  body("businessAddress.state").optional().isString(),

  body("businessAddress.country").optional().isString(),

  body("businessAddress.pincode")
    .optional()
    .isPostalCode("IN")
    .withMessage("Invalid pincode"),

  body("businessAddress.latitude")
    .optional()
    .isFloat()
    .withMessage("Invalid latitude or longitude"),
  body("businessAddress.longitude")
    .optional()
    .isFloat()
    .withMessage("Invalid latitude or longitude"),

  body("gstNumber")
    .optional()
    .isString()
    .isLength({ min: 15, max: 15 })
    .withMessage("GST number must be 15 characters"),

  body("contactNumber").optional().isMobilePhone("en-IN"),

  body("companyWebsiteURl").optional(),

  body("accountHolderName").optional().isString(),
  body("bankName")
    .notEmpty()
    .trim()
    .isString()
    .withMessage("Bank name is required"),

  body("accountNumber")
    .notEmpty()
    .withMessage("Account number is required")
    .trim()
    .isNumeric()
    .withMessage("Account number must be numeric")
    .isLength({ min: 9, max: 18 })
    .withMessage("Account number must be between 9 to 18 digits"),

  body("confirmAccountNumber")
    .notEmpty()
    .withMessage("Confirm account number is required")
    .trim()
    .custom((value, { req }) => {
      if (!req.body.accountNumber) {
        throw new Error("Account number is missing");
      }
      if (value !== req.body.accountNumber) {
        throw new Error("Account number does not match");
      }
      return true;
    }),

  body("ifscCode")
    .optional()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage("Invalid IFSC code"),

  body("accountType")
    .notEmpty()
    .trim()
    .isIn(["SBI", "BOB", "UNION BANK", "HDFC", "ICICI", "Axis", "Other"])
    .withMessage("Invalid account type"),

  body("upiId")
    .optional()
    .matches(/^[\w.-]+@[\w.-]+$/)
    .withMessage("Invalid UPI ID"),
];
