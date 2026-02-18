import { body } from "express-validator";

export const vendorValidation = {
  createVendor: [
    /* =====================
       BASIC BUSINESS INFO
    ====================== */
    body("businessName")
      .trim()
      .notEmpty()
      .withMessage("Business name is required")
      .escape()
      .isLength({ max: 100 })
      .withMessage("Business name cannot exceed 100 characters"),

    body("businessEntityType")
      .isIn([
        "Proprietorship",
        "Partnership",
        "LLP",
        "Private Limited Company",
        "Other",
      ])
      .withMessage("Invalid business entity type"),

    body("yearEstablished")
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage("Year established must be a valid year"),

    body("ownerName")
      .notEmpty()
      .withMessage("Owner name is required")
      .trim()
      .escape(),

    body("primaryContactPerson")
      .notEmpty()
      .withMessage("Primary contact person is required")
      .trim()
      .escape(),

    body("phoneNumber")
      .matches(/^[0-9]{10}$/)
      .withMessage("Phone number must be a 10-digit number"),

    body("email")
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail(),

    body("password").trim().notEmpty().withMessage("Password is required"),

    body("website")
      .optional({ nullable: true })
      .isURL()
      .withMessage("Website must be a valid URL"),

    body("role").notEmpty().withMessage("Business role is required"),

    body("gstNumber")
      .matches(/^[0-9A-Z]{15}$/)
      .withMessage("Invalid GST number format"),

    body("panNumber")
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
      .withMessage("Invalid PAN number format"),

    body("tradeLicenseNumber")
      .notEmpty()
      .withMessage("Trade license number is required"),

    body("registeredAddress.fullAddress")
      .notEmpty()
      .withMessage("Address is required"),

    body("registeredAddress").custom((addr) => {
      if (!addr) return true;

      const lat = addr.latitude;
      const lng = addr.longitude;

      if ((lat && !lng) || (!lat && lng)) {
        throw new Error("Latitude and longitude must be provided together");
      }
      return true;
    }),

    body("registeredAddress.placeId").optional().isString(),

    body("storageAddress").optional({ nullable: true }).trim(),
    /* =====================
       PRODUCT & CATEGORY
    ====================== */
    body("supplyCategories")
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("Select at least one supply category"),

    body("primaryCategory")
      .notEmpty()
      .withMessage("Primary category is required"),

    body("authorizedBrands")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      }),

    body("skuRange").notEmpty().withMessage("SKU range is required"),

    body("catalogManagementMethod")
      .notEmpty()
      .withMessage("Catalog management method is required"),

    body("fastMovingProducts")
      .notEmpty()
      .withMessage("Fast moving products are required"),

    body("brandedProductsOnly")
      .notEmpty()
      .withMessage("Branded products selection is required"),

    body("technicalDocsAvailable")
      .notEmpty()
      .withMessage("Technical document availability is required"),

    body("testCertificatesAvailable")
      .notEmpty()
      .withMessage("Test certificate availability is required"),

    /* =====================
       QUALITY & OPERATIONS
    ====================== */
    body("internalQualityCheckRating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Quality rating must be between 1 and 5"),

    body("dailyDispatchCapacity")
      .notEmpty()
      .withMessage("Daily dispatch capacity is required"),

    body("truckDeliveryAvailable")
      .notEmpty()
      .withMessage("Truck delivery option is required"),

    body("largestOrderHandled")
      .notEmpty()
      .withMessage("Largest order handled is required"),

    body("safetyStock")
      .notEmpty()
      .withMessage("Safety stock selection is required"),

    body("stockUpdateFrequency")
      .notEmpty()
      .withMessage("Stock update frequency is required"),

    /* =====================
       DELIVERY & LOGISTICS
    ====================== */
    body("ownDeliveryVehicles")
      .notEmpty()
      .withMessage("Delivery vehicle information is required"),

    body("deliveryRadius")
      .notEmpty()
      .withMessage("Delivery radius is required"),

    body("averageDeliveryTime")
      .notEmpty()
      .withMessage("Average delivery time is required"),

    body("maxOrderValuePerDelivery")
      .notEmpty()
      .withMessage("Maximum order value per delivery is required"),

    body("operatingHours")
      .notEmpty()
      .withMessage("Business operating hours are required"),

    body("vehicleTypes")
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("Select at least one vehicle type"),

    body("loadingFacilityAvailable")
      .isBoolean()
      .withMessage("Loading/unloading facility info is required"),

    body("siteDeliveryAvailable")
      .notEmpty()
      .withMessage("Construction site delivery option is required"),

    body("serviceablePincodes")
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("At least one serviceable pincode is required"),

    body("serviceablePincodes.*")
      .matches(/^[0-9]{6}$/)
      .withMessage("Invalid pincode format"),

    /* =====================
       BANK DETAILS
    ====================== */
    body("bankDetails.accountHolderName")
      .notEmpty()
      .withMessage("Account holder name is required"),

    body("bankDetails.accountNumber")
      .notEmpty()
      .withMessage("Bank account number is required"),

    body("bankDetails.bankName")
      .notEmpty()
      .withMessage("Bank name is required"),

    body("bankDetails.ifscCode")
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage("Invalid IFSC code format"),

    body("bankDetails.accountType")
      .isIn(["Savings", "Current"])
      .withMessage("Account type must be Savings or Current"),

    // body("bankDetails.cancelledCheque")
    //   .isURL()
    //   .withMessage("Cancelled cheque must be a valid URL"),

    /* =====================
       COMPLIANCE & CONSENT
    ====================== */
    body("pastQualityDisputes")
      .isBoolean()
      .withMessage("Quality dispute history is required"),

    body("disputeDetails")
      .if(body("pastQualityDisputes").equals("true"))
      .notEmpty()
      .withMessage("Please provide dispute details"),

    body("auditAgreements")
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("At least one audit agreement must be accepted"),

    body("vendorAgreementAccepted")
      .equals("true")
      .withMessage("Vendor agreement must be accepted"),

    body("privacyPolicyAccepted")
      .equals("true")
      .withMessage("Privacy policy must be accepted"),
  ],
  updateVendor: [
    /* =====================
       BASIC BUSINESS INFO
    ====================== */
    body("businessName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Business name cannot be empty")
      .escape()
      .isLength({ max: 100 })
      .withMessage("Business name cannot exceed 100 characters"),

    body("businessEntityType")
      .optional()
      .isIn([
        "Proprietorship",
        "Partnership",
        "LLP",
        "Private Limited Company",
        "Other",
      ])
      .withMessage("Invalid business entity type"),

    body("yearEstablished")
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() })
      .withMessage("Year established must be a valid year"),

    body("ownerName").optional().trim().escape(),

    body("primaryContactPerson").optional().trim().escape(),

    body("phoneNumber")
      .optional()
      .matches(/^[0-9]{10}$/)
      .withMessage("Phone number must be a 10-digit number"),

    body("email")
      .optional()
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail(),

    body("password").optional().trim().notEmpty(),

    body("website")
      .optional({ nullable: true })
      .isURL()
      .withMessage("Website must be a valid URL"),

    body("role").optional().notEmpty(),

    body("gstNumber")
      .optional()
      .matches(/^[0-9A-Z]{15}$/)
      .withMessage("Invalid GST number format"),

    body("panNumber")
      .optional()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
      .withMessage("Invalid PAN number format"),

    body("tradeLicenseNumber").optional().notEmpty(),

    body("registeredAddress.fullAddress").optional().notEmpty(),

    body("registeredAddress")
      .optional()
      .custom((addr) => {
        if (!addr) return true;
        const { latitude, longitude } = addr;
        if ((latitude && !longitude) || (!latitude && longitude)) {
          throw new Error("Latitude and longitude must be provided together");
        }
        return true;
      }),

    body("registeredAddress.placeId").optional().isString(),

    body("storageAddress").optional({ nullable: true }).trim(),

    /* =====================
       PRODUCT & CATEGORY
    ====================== */
    body("supplyCategories")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("Select at least one supply category"),

    body("primaryCategory").optional().notEmpty(),

    body("authorizedBrands")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      }),

    body("skuRange").optional().notEmpty(),
    body("catalogManagementMethod").optional().notEmpty(),
    body("fastMovingProducts").optional().notEmpty(),
    body("brandedProductsOnly").optional().notEmpty(),
    body("technicalDocsAvailable").optional().notEmpty(),
    body("testCertificatesAvailable").optional().notEmpty(),

    /* =====================
       QUALITY & OPERATIONS
    ====================== */
    body("internalQualityCheckRating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Quality rating must be between 1 and 5"),

    body("dailyDispatchCapacity").optional().notEmpty(),
    body("truckDeliveryAvailable").optional().notEmpty(),
    body("largestOrderHandled").optional().notEmpty(),
    body("safetyStock").optional().notEmpty(),
    body("stockUpdateFrequency").optional().notEmpty(),

    /* =====================
       DELIVERY & LOGISTICS
    ====================== */
    body("ownDeliveryVehicles").optional().notEmpty(),
    body("deliveryRadius").optional().notEmpty(),
    body("averageDeliveryTime").optional().notEmpty(),
    body("maxOrderValuePerDelivery").optional().notEmpty(),
    body("operatingHours").optional().notEmpty(),

    body("vehicleTypes")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("Select at least one vehicle type"),

    body("loadingFacilityAvailable")
      .optional()
      .isBoolean()
      .withMessage("Loading/unloading facility info is required"),

    body("siteDeliveryAvailable").optional().notEmpty(),

    body("serviceablePincodes")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      })
      .withMessage("At least one serviceable pincode is required"),

    body("serviceablePincodes.*")
      .optional()
      .matches(/^[0-9]{6}$/)
      .withMessage("Invalid pincode format"),

    /* =====================
       BANK DETAILS
    ====================== */
    body("bankDetails.accountHolderName").optional().notEmpty(),
    body("bankDetails.accountNumber").optional().notEmpty(),
    body("bankDetails.bankName").optional().notEmpty(),

    body("bankDetails.ifscCode")
      .optional()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage("Invalid IFSC code format"),

    body("bankDetails.accountType")
      .optional()
      .isIn(["Savings", "Current"])
      .withMessage("Account type must be Savings or Current"),

    /* =====================
       COMPLIANCE & CONSENT
    ====================== */
    body("pastQualityDisputes")
      .optional()
      .isBoolean()
      .withMessage("Quality dispute history is required"),

    body("disputeDetails")
      .optional()
      .if(body("pastQualityDisputes").equals("true"))
      .notEmpty()
      .withMessage("Please provide dispute details"),

    body("auditAgreements")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return typeof value === "string" && value.length > 0;
      }),

    body("vendorAgreementAccepted").optional().equals("true"),
    body("privacyPolicyAccepted").optional().equals("true"),
  ],
};
