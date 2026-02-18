import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessEntityType: {
      type: String,
      enum: [
        "Proprietorship",
        "Partnership",
        "LLP",
        "Private Limited Company",
        "Other",
      ],
      required: true,
    },
    yearEstablished: {
      type: Number,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    primaryContactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
    website: {
      type: String,
      default: null,
    },
    // LEGAL & TAX INFO
    role: {
      type: String,
      enum: [
        "Local Supplier",
        "Retailer",
        "Distributor",
        "Both distributor and reseller",
        "Manufacturer",
      ],
      required: true,
    },
    gstNumber: {
      type: String,
      required: true,
      uppercase: true,
    },
    panNumber: {
      type: String,
      required: true,
      uppercase: true,
    },
    tradeLicenseNumber: {
      type: String,
      required: true,
    },

    // registeredAddress: {
    //   type: String,
    //   required: true,
    // },

    registeredAddress: {
      fullAddress: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [lng, lat]
        },
      },
      placeId: String,
    },

    storageAddress: {
      type: String,
      default: null,
    },

    documents: {
      storefrontPhotos: [String],
      gstCertificate: String,
      panCard: String,
      tradeLicense: String,
      isoCertificate: String,
    },

    // PRODUCT & CATEGORY INFO
    supplyCategories: {
      type: [String],
      enum: [
        "Building Materials",
        "Plumbing & Sanitary",
        "Electrical & Lightings",
        "Hardware, Tools & Equipment",
        "Interiors & Finishing",
        "Exterior & Landscaping",
        "Others",
      ],
      required: true,
    },
    primaryCategory: {
      type: String,
      required: true,
    },
    authorizedBrands: {
      type: [String],
      default: [],
    },
    skuRange: {
      type: String,
      enum: ["1-50", "51-200", "201-500", "501-1,000", "1,000+"],
      required: true,
    },
    catalogManagementMethod: {
      type: String,
      enum: ["Excel", "ERP", "Manual", "Other"],
    },
    fastMovingProducts: {
      type: String,
    },
    brandedProductsOnly: {
      type: String,
      enum: ["Yes", "No", "Both"],
      default: "Both",
      required: true,
    },

    technicalDocsAvailable: {
      type: String,
      enum: [
        "Yes, for all products",
        "Yes, for most products",
        "No, but can arrange",
        "No",
      ],
    },
    testCertificatesAvailable: {
      type: String,
      enum: ["Yes", "No", "Maybe"],
      default: "Maybe",
    },
    // QUALITY & OPERATIONS
    internalQualityCheckRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    dailyDispatchCapacity: {
      type: String,
      required: true,
    },
    truckDeliveryAvailable: {
      type: String,
      enum: [
        "Yes, we arrange all logistics",
        "Yes, but customer needs to arrange",
        "No",
      ],
      required: true,
    },
    largestOrderHandled: {
      type: String,
    },
    safetyStock: {
      type: String,
      enum: ["Yes, always", "Yes, for key products only", "No"],
    },
    stockUpdateFrequency: {
      type: String,
    },

    //DELIVERY & LOGISTICS
    ownDeliveryVehicles: {
      type: String,
      enum: [
        "Yes, we have our own vehicles",
        "No, we use third-party logistics",
        "Both",
      ],
    },
    deliveryRadius: {
      type: String,
    },
    averageDeliveryTime: {
      type: String,
    },
    maxOrderValuePerDelivery: {
      type: String,
    },
    operatingHours: {
      type: String,
    },
    deliveryNotes: {
      type: String,
      default: null,
    },
    vehicleTypes: {
      type: [String],
    },
    loadingFacilityAvailable: {
      type: Boolean,
    },
    siteDeliveryAvailable: {
      type: String,
      enum: ["Yes, always", "Depends on site accessibility", "No"],
    },
    serviceablePincodes: {
      type: [String],
    },
    // PLATFORM & ORDER MGMT
    catalogUploadCapability: {
      type: String,
      required: true,
    },
    productImagesAvailable: {
      type: String,
    },
    productGenuinenessGuarantee: {
      type: Boolean,
    },
    returnPolicy: {
      type: String,
    },
    realTimeInventorySystem: {
      type: Boolean,
    },
    orderProcessingStaffCount: {
      type: String,
    },
    experienceYears: {
      type: String,
    },
    maxOrderProcessingTime: {
      type: String,
    },
    sameDayDispatchAgreement: {
      type: Boolean,
    },

    //BANK & PAYMENTS
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      accountType: {
        type: String,
        enum: ["Savings", "Current"],
      },
      cancelledCheque: String,
      paymentCycle: String,
    },

    //COMPLIANCE & CONSENT
    pastQualityDisputes: {
      type: Boolean,
      required: true,
    },
    disputeDetails: {
      type: String,
      default: null,
    },
    auditAgreements: {
      type: [String],
    },
    referralSource: {
      type: String,
    },
    additionalNotes: {
      type: String,
      default: null,
    },
    vendorAgreementAccepted: {
      type: Boolean,
      required: true,
    },
    privacyPolicyAccepted: {
      type: Boolean,
      required: true,
    },
    marketingConsent: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    badges: [
      {
        type: String,
        enum: [
          "TOP_VENDOR",
          "MOST_SOLD",
          "FAST_DELIVERY",
          "HIGH_RATING",
          "TRUSTED_SELLER",
          "ADMIN_PICK",
        ],
        default: [],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);
export default mongoose.model("Vendor", vendorSchema);
