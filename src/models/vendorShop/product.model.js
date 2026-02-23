import mongoose from "mongoose";

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
  },
  { timestamps: true },
);

// heavy-duty index for marketplace filtering
productSchema.index({
  moduleId: 1,
  pcategoryId: 1,
  categoryId: 1,
  subcategoryId: 1,
  brandId: 1,
});

productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  }
  next();
});
export default mongoose.model("Product", productSchema);
