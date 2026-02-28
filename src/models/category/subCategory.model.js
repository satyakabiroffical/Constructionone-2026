import mongoose from "mongoose";
import slugify from "slugify";

const subCategorySchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformModule",
      required: [true, "Module ID is required"],
      index: true,
    },
    pcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pcategory",
      required: [true, "Parent Category ID is required"],
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "SubCategory name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    image: {
      type: String,
      default: "",
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Uniqueness: name unique per category
subCategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });
// Performance: optimizes filtered list queries by categoryId + isActive + order
subCategorySchema.index({ categoryId: 1, isActive: 1, order: 1 });

subCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("SubCategory", subCategorySchema);
