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
      ref: "PCategory",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },

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

    city: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "City",
      },
    ],

    state: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "State",
      },
    ],
    deliveryCharges: {
      type: String,
      enum: ["free", "fixedCharge", "distanceAndWeightBased", "customerPickup"],
      trim: true,
    },
    shippingCharges: {
      fixed: { type: Number },
      distancePerKm: { type: Number },
      weightPerKg: { type: Number },
    },
    returnPolicy: {
      type: String,
      enum: ["noReturn", "7day", "15day", "13day", "defectiveReplacement"],
      trim: true,
    },
    warrantyPeriod: {
      type: String,
      enum: ["no-warranty", "6month", "1year", "2year", "5year", "lifetime"],
      trim: true,
    },

    defaultVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
    },

    preferredPayementMethod: {
      type: String,
      enum: [
        "100advance",
        "50-advance-50-on-delivery",
        "30-days-credit",
        "cod",
        "as-per-purchase-order",
      ],
    },
    safetyInstructions: {
      type: String,
      trim: true,
    },

    varified: {
      type: Boolean,
      default: false,
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

    returnDays: {
      type: Number,
      default: 7,   // days after delivery within which return is allowed
      min: 0,       // 0 = product is not returnable
    },

    disable: {
      type: Boolean,
      default: false,
    },
    discount: {
      type: Number,
      min: 0,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorProfile",
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

    //asgr
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
  },
  { timestamps: true },
);

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
  subcategoryName: "text"
});

// 🔥 ULTRA FAST INDEX
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

// ⚡ PARTIAL INDEX
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

//asgr
productSchema.index({
  "flashSale.isActive": 1,
  "flashSale.startDateTime": 1,
  "flashSale.endDateTime": 1,
});
export default mongoose.model("Product", productSchema);
