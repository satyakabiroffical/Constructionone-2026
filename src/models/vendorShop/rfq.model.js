import mongoose from "mongoose";

const rfqItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    productName: { type: String, required: true },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },

    specification: String,

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    size: String,

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    moqSnapshot: Number,
  },
  { _id: false },
);

const rfqSchema = new mongoose.Schema(
  {
    //  USER
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: String,
    userImage: String,
    userPhone: String,

    // VENDOR
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
      index: true,
    },

    //  ITEMS
    items: {
      type: [rfqItemSchema],
      validate: (v) => v.length > 0 && v.length <= 20,
    },

    //  DELIVERY
    deliveryLocation: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    deliveryType: {
      type: String,
      enum: ["single", "phased"],
      default: "single",
    },

    expectedDeliveryDate: {
      type: Date,
      required: true,
      index: true,
    },

    //  COMMERCIAL
    targetPrice: Number,

    gstPreference: {
      type: String,
      enum: ["inclusive", "exclusive"],
      required: true,
    },

    transportPreference: {
      type: String,
      enum: ["inclusive", "extra"],
      required: true,
    },

    paymentTerms: {
      type: String,
      enum: ["100_advance", "50_50", "cod", "30_days_credit"],
      required: true,
    },

    note: String,

    agreedToTerms: {
      type: Boolean,
      required: true,
      validate: (v) => v === true,
    },

    status: {
      type: String,
      enum: ["pending", "quoted", "rejected", "closed"],
      default: "pending",
      index: true,
    },

    rfqNumber: {
      type: String,
      unique: true,
      index: true,
    },

  },
  { timestamps: true },
);

// vendor dashboard speed
rfqSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export default mongoose.model("RFQ", rfqSchema);
