import Joi from "joi";
const requiredMsg = (field) => `${field} is required`;

export const vendorValidationSchema = Joi.object({
  email: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": requiredMsg("Email"),
      "string.empty": "Email cannot be empty",
    }),
  businessName: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": requiredMsg("Business name"),
      "string.empty": "Business name cannot be empty",
    }),

  businessEntityType: Joi.string()
    .valid(
      "Proprietorship",
      "Partnership",
      "LLP",
      "Private Limited Company",
      "Other",
    )
    .required()
    .messages({
      "any.only": "Invalid business entity type",
      "any.required": requiredMsg("Business entity type"),
    }),

  yearEstablished: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear())
    .required()
    .messages({
      "number.base": "Year established must be a number",
      "number.min": "Year established is too old",
      "number.max": "Year established cannot be in the future",
      "any.required": requiredMsg("Year established"),
    }),

  ownerName: Joi.string()
    .required()
    .messages({
      "any.required": requiredMsg("Owner name"),
      "string.empty": "Owner name cannot be empty",
    }),

  primaryContactPerson: Joi.string()
    .required()
    .messages({
      "any.required": requiredMsg("Primary contact person"),
    }),

  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be a 10-digit number",
      "any.required": requiredMsg("Phone number"),
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email address",
      "any.required": requiredMsg("Email"),
    }),

  website: Joi.string().uri().allow(null, "").messages({
    "string.uri": "Website must be a valid URL",
  }),

  role: Joi.string()
    .required()
    .messages({
      "any.required": requiredMsg("Business role"),
    }),

  gstNumber: Joi.string()
    .pattern(/^[0-9A-Z]{15}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid GST number format",
      "any.required": requiredMsg("GST number"),
    }),

  panNumber: Joi.string()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid PAN number format",
      "any.required": requiredMsg("PAN number"),
    }),

  tradeLicenseNumber: Joi.string()
    .required()
    .messages({
      "any.required": requiredMsg("Trade license number"),
    }),

  registeredAddress: Joi.string()
    .required()
    .messages({
      "any.required": requiredMsg("Registered business address"),
    }),

  storageAddress: Joi.string().allow(null, ""),

  documents: Joi.object({
    storefrontPhotos: Joi.array().items(Joi.string().uri()).min(1).messages({
      "array.min": "At least one storefront photo is required",
    }),

    gstCertificate: Joi.string().uri().required().messages({
      "any.required": "GST certificate is required",
      "string.uri": "GST certificate must be a valid URL",
    }),

    panCard: Joi.string().uri().required().messages({
      "any.required": "PAN card document is required",
    }),

    tradeLicense: Joi.string().uri().required().messages({
      "any.required": "Trade license document is required",
    }),

    isoCertificate: Joi.string().uri().allow(null, ""),
  }).required(),

  /* =====================
     PRODUCT & CATEGORY
  ====================== */
  supplyCategories: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "Select at least one supply category",
    "any.required": "Supply category is required",
  }),

  primaryCategory: Joi.string().required().messages({
    "any.required": "Primary category is required",
  }),

  authorizedBrands: Joi.array().items(Joi.string()),

  skuRange: Joi.string().required().messages({
    "any.required": "SKU range is required",
  }),

  catalogManagementMethod: Joi.string().required().messages({
    "any.required": "Catalog management method is required",
  }),

  fastMovingProducts: Joi.string().required().messages({
    "any.required": "Fast moving products are required",
  }),

  brandedProductsOnly: Joi.string().required().messages({
    "any.required": "Branded products selection is required",
  }),

  technicalDocsAvailable: Joi.string().required().messages({
    "any.required": "Technical document availability is required",
  }),

  testCertificatesAvailable: Joi.string().required().messages({
    "any.required": "Test certificate availability is required",
  }),

  /* =====================
     QUALITY & OPERATIONS
  ====================== */
  internalQualityCheckRating: Joi.number().min(1).max(5).required().messages({
    "number.min": "Quality rating must be at least 1",
    "number.max": "Quality rating cannot exceed 5",
    "any.required": "Internal quality check rating is required",
  }),

  dailyDispatchCapacity: Joi.string().required().messages({
    "any.required": "Daily dispatch capacity is required",
  }),

  truckDeliveryAvailable: Joi.string().required().messages({
    "any.required": "Truck delivery option is required",
  }),

  largestOrderHandled: Joi.string().required().messages({
    "any.required": "Largest order handled is required",
  }),

  safetyStock: Joi.string().required().messages({
    "any.required": "Safety stock selection is required",
  }),

  stockUpdateFrequency: Joi.string().required().messages({
    "any.required": "Stock update frequency is required",
  }),

  /* =====================
     DELIVERY & LOGISTICS
  ====================== */
  ownDeliveryVehicles: Joi.string().required().messages({
    "any.required": "Delivery vehicle information is required",
  }),

  deliveryRadius: Joi.string().required().messages({
    "any.required": "Delivery radius is required",
  }),

  averageDeliveryTime: Joi.string().required().messages({
    "any.required": "Average delivery time is required",
  }),

  maxOrderValuePerDelivery: Joi.string().required().messages({
    "any.required": "Maximum order value per delivery is required",
  }),

  operatingHours: Joi.string().required().messages({
    "any.required": "Business operating hours are required",
  }),

  deliveryNotes: Joi.string().allow(null, ""),

  vehicleTypes: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "Select at least one vehicle type",
    "any.required": "Vehicle types are required",
  }),

  loadingFacilityAvailable: Joi.boolean().required().messages({
    "any.required": "Loading/unloading facility info is required",
  }),

  siteDeliveryAvailable: Joi.string().required().messages({
    "any.required": "Construction site delivery option is required",
  }),

  serviceablePincodes: Joi.array()
    .items(Joi.string().pattern(/^[0-9]{6}$/))
    .min(1)
    .required()
    .messages({
      "array.min": "At least one serviceable pincode is required",
      "string.pattern.base": "Invalid pincode format",
    }),

  catalogUploadCapability: Joi.string().required().messages({
    "any.required": "Catalog upload capability is required",
  }),

  productImagesAvailable: Joi.string().required().messages({
    "any.required": "Product image availability is required",
  }),

  productGenuinenessGuarantee: Joi.boolean().required().messages({
    "any.required": "Product genuineness confirmation is required",
  }),

  returnPolicy: Joi.string().required().messages({
    "any.required": "Return policy is required",
  }),

  realTimeInventorySystem: Joi.boolean().required().messages({
    "any.required": "Inventory system information is required",
  }),

  orderProcessingStaffCount: Joi.string().required().messages({
    "any.required": "Order processing staff count is required",
  }),

  experienceYears: Joi.string().required().messages({
    "any.required": "Experience in construction business is required",
  }),

  maxOrderProcessingTime: Joi.string().required().messages({
    "any.required": "Maximum order processing time is required",
  }),

  sameDayDispatchAgreement: Joi.boolean().required().messages({
    "any.required": "Same-day dispatch agreement is required",
  }),

  /* =====================
     BANK & PAYMENTS
  ====================== */
  bankDetails: Joi.object({
    accountHolderName: Joi.string().required().messages({
      "any.required": "Account holder name is required",
    }),
    accountNumber: Joi.string().required().messages({
      "any.required": "Bank account number is required",
    }),
    bankName: Joi.string().required().messages({
      "any.required": "Bank name is required",
    }),
    ifscCode: Joi.string()
      .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid IFSC code format",
        "any.required": "IFSC code is required",
      }),
    accountType: Joi.string().valid("Savings", "Current").required().messages({
      "any.only": "Account type must be Savings or Current",
    }),
    cancelledCheque: Joi.string().uri().required().messages({
      "any.required": "Cancelled cheque is required",
    }),
    paymentCycle: Joi.string().required().messages({
      "any.required": "Payment cycle is required",
    }),
  }).required(),

  /* =====================
     COMPLIANCE & CONSENT
  ====================== */
  pastQualityDisputes: Joi.boolean().required().messages({
    "any.required": "Quality dispute history is required",
  }),

  disputeDetails: Joi.when("pastQualityDisputes", {
    is: true,
    then: Joi.string().required().messages({
      "any.required": "Please provide dispute details",
    }),
    otherwise: Joi.string().allow(null, ""),
  }),

  auditAgreements: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one audit agreement must be accepted",
  }),

  referralSource: Joi.string().required().messages({
    "any.required": "Referral source is required",
  }),

  additionalNotes: Joi.string().allow(null, ""),

  vendorAgreementAccepted: Joi.boolean().valid(true).required().messages({
    "any.only": "Vendor agreement must be accepted",
  }),

  privacyPolicyAccepted: Joi.boolean().valid(true).required().messages({
    "any.only": "Privacy policy must be accepted",
  }),

  marketingConsent: Joi.boolean().default(false),
});
