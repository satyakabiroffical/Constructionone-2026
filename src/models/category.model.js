import mongoose from "mongoose";
import { APIError } from "../middleware/errorHandler.js";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [3, "Category name must be at least 3 characters"],
      maxlength: [50, "Category name must be at most 50 characters"],
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      required: [true, "Category type is required"],
      trim: true,
    },

    pCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pcategory",
      required: [true, "Parent category is required"],
    },

    icon: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

categorySchema.index({ name: 1 });
categorySchema.index({ type: 1, isActive: 1 });


categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }
  if (this.isModified("slug")) {
    this.slug = this.slug.trim().toLowerCase();
  }
  next();
});


// categorySchema.pre(/^find/, function (next) {
//   if (this.getFilter().isActive === undefined) {
//     this.find({ isActive: true });
//   }
//   next();
// });



categorySchema.virtual("hasIcon").get(function () {
  return Boolean(this.icon);
});



categorySchema.post("save", function (error, doc, next) {
  if (error.code === 11000) {
    next(new APIError(400, "Category slug must be unique", true));
  } else if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(e => e.message);
    next(new APIError(400, messages.join(". "), true));
  } else {
    next(error);
  }
});


const categoryModel = mongoose.model("Category", categorySchema);
export default categoryModel;
