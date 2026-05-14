import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    price: {
      type: Number,
      min: 0,
      index: true,
    },
    mrp: {
      type: Number,
      min: 0,
      index: true,
    },

    discount: {
      type: Number,
      min: 0,
      index: true,
    },

    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    size: {
      type: String,
      trim: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    sold: {
      type: Number,
      default: 0,
    },
    Type: {
      type: String,
      enum: ["BULK", "RETAIL"],
    },

    disable: {
      type: Boolean,
      default: false,
    },
    //minium order quantity -MOQ
    moq: {
      type: Number,
      default: 0,
    },
    //kg
    packageWeight: {
      type: Number,
    },

    packageDimensions: {
      type: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },
  },
  { timestamps: true },
);

// ULTRA IMPORTANT INDEX (for marketplace speed)
variantSchema.index({
  moduleId: 1,
  pcategoryId: 1,
  categoryId: 1,
  subcategoryId: 1,
  brandId: 1,
  productId: 1,
  price: 1,
});

export default mongoose.model("Variant", variantSchema);
