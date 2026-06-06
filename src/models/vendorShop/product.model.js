import mongoose from "mongoose";
const PROPERTY_KEYS = [
  "fire_resistance",
  "durability",
  "eco_friendly",
  "water_resistance",
  "weather_proof",
];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      lowercase: true,
      index: true,
    },

    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },

    pcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pcategory",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // subcategoryId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Subcategory",
    //   required: true,
    //   index: true,
    // },

    subcategoryId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
        required: true,
      },
    ],

    // multiple product types
    productTypeId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductType",
        required: true,
      },
    ],

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    description: String,
    images: [String],

    sku: {
      type: String,
      trim: true,
      index: true,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    origin: {
      type: String,
      trim: true,
      default: "India",
    },

    features: {
      type: String,
      trim: true,
    },

    thumbnail: {
      type: String,
      trim: true,
    },

    avgRating: {
      type: Number,
      default: 0,
    },

    ratingSum: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    measurementUnit: {
      type: String,
      enum: [
        "piece",
        "kg",
        "liter",
        "meter",
        "box",
        "supermeter",
        "cubicmeter",
        "set",
        "roll",
      ],
    },

    leadTime: {
      type: String,
    },

    // "fixedCharge",
    //   "distanceAndWeightBased",
    //   "customerPickup",

    deliveryCharges: {
      type: String,
      enum: ["free", "distanceWeightVolumeBased"],
      trim: true,
      default: "distanceWeightVolumeBased",
    },

    deliveryOptions: {
      type: [String],
      enum: ["self", "logistic", "vendor"],
      default: ["self", "logistic"],
    },

    serviceableDeliveryPincode: {
      type: [
        {
          type: String,
          trim: true,
          validate: {
            validator: function (value) {
              return /^\d{6}$/.test(value);
            },
            message: "Invalid pincode format",
          },
        },
      ],
      default: [],
    },

    // shippingCharges: {
    //   fixed: { type: Number },
    //   distancePerKm: { type: Number },
    //   weightPerKg: { type: Number },
    // },

    shippingCharges: {
      fixed: { type: Number, default: 0 },
      distancePerKm: { type: Number, default: 0 },
      weightPerKg: { type: Number, default: 0 },
      perPieceCharge: { type: Number, default: 0 },
      perLiterCharge: { type: Number, default: 0 },
      perMeterCharge: { type: Number, default: 0 },
      perBoxCharge: { type: Number, default: 0 },
      perSuperMeterCharge: { type: Number, default: 0 },
      perCubicMeterCharge: { type: Number, default: 0 },
      perSetCharge: { type: Number, default: 0 },
      perRollCharge: { type: Number, default: 0 },
    },

    // returnPolicy: {
    //   type: String,
    //   enum: ["noReturn", "7day", "15day", "13day", "defectiveReplacement"],
    //   trim: true,
    // },

    warrantyPeriod: {
      type: String,
      default: "No Warranty",
    },

    defaultVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
    },

    // preferredPayementMethod: {
    //   type: String,
    //   enum: [
    //     "100advance",
    //     "50-advance-50-on-delivery",
    //     "30-days-credit",
    //     "cod",
    //     "as-per-purchase-order",
    //   ],
    // },

    safetyInstructions: {
      type: String,
      trim: true,
    },

    varified: {
      type: Boolean,
      default: false,
    },

    verifyReason: {
      type: String,
      default: "",
    },

    metaData: {
      title: { type: String, default: "Product" },
      description: { type: String, default: "Product" },
      keywords: { type: [String], default: ["Product"] },
    },

    specification: {
      type: String,
    },

    sold: {
      type: Number,
      default: 0,
    },

    // returnDays: {
    //   type: Number,
    //   default: 7, // days after delivery within which return is allowed
    //   min: 0, // 0 = product is not returnable
    // },

    disable: {
      type: Boolean,
      default: false,
    },

    discount: {
      type: Number,
      min: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isFlashSale: {
      type: Boolean,
      default: false,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },

    vendorLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    properties: {
      type: [
        {
          key: {
            type: String,
            enum: PROPERTY_KEYS,
          },
          value: String,
        },
      ],
      validate: {
        validator: function (props) {
          if (!props || props.length === 0) return true;
          const keys = props.map((p) => p.key);
          return keys.length === new Set(keys).size;
        },
        message: "Duplicate properties are not allowed",
      },
    },

    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "OUT_OF_STOCK"],
      default: "ACTIVE",
    },

    protips: {
      type: [String],
      default: [],
    },
    productHighlights: {
      type: [String],
      default: [],
    },
    technicalDocuments: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

productSchema.index({ vendorLocation: "2dsphere" });
// heavy-duty index for marketplace filtering
// base category index
productSchema.index({
  moduleId: 1,
  pcategoryId: 1,
  categoryId: 1,
  subcategoryId: 1,
  brandId: 1,
});
productSchema.index({
  name: "text",
  description: "text",
  sku: "text",
  brandName: "text",
  categoryName: "text",
  subcategoryName: "text",
});

//  ULTRA FAST INDEX
productSchema.index(
  {
    disable: 1,
    varified: 1,
    moduleId: 1,
    pcategoryId: 1,
    categoryId: 1,
    subcategoryId: 1,
    brandId: 1,
    createdAt: -1,
  },
  { name: "idx_marketplace_core" },
);
// PARTIAL INDEX
productSchema.index(
  {
    categoryId: 1,
    brandId: 1,
    createdAt: -1,
  },
  {
    partialFilterExpression: {
      disable: false,
      varified: true,
    },
    name: "idx_active_products",
  },
);
// optional future filter
productSchema.index({ "properties.key": 1 });

productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  }
  next();
});

export default mongoose.model("Product", productSchema);
