import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
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

    moq: {
      type: Number,
      default: 0,
    },

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
