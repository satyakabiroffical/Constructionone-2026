import mongoose from "mongoose";
import { APIError } from "../middleware/errorHandler.js";

const pcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Parent category name is required"],
      trim: true,
      minlength: [3, "Parent category name must be at least 3 characters"],
      maxlength: [50, "Parent category name must be at most 50 characters"],
    },

    type: {
      type: String,
      required: [true, "Category type is required"],
      enum: {
        values: [
          "MAKEUP",
          "SPA",
          "PERFUME",
          "NAILS",
          "SKINCARE",
          "HAIR",
          "CARE",
        ],
        message: "Invalid parent category type",
      },
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
      lowercase: true,
      trim: true,
      // unique: true,
      index: true,
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

pcategorySchema.index({ name: 1 });
pcategorySchema.index({ type: 1, isActive: 1 });


pcategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.name = this.name.trim();
  }
  if (this.isModified("slug")) {
    this.slug = this.slug.trim().toLowerCase();
  }
  next();
});


pcategorySchema.pre(/^find/, function (next) {
  if (this.getFilter().isActive === undefined) {
    this.find({ isActive: true });
  }
  next();
});


pcategorySchema.virtual("hasMedia").get(function () {
  return Boolean(this.icon || this.image);
});


pcategorySchema.post("save", function (error, doc, next) {
  if (error.code === 11000) {
    next(new APIError(400, "Parent category slug must be unique", true));
  } else if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(e => e.message);
    next(new APIError(400, messages.join(". "), true));
  } else {
    next(error);
  }
});


const pcategoryModel = mongoose.model("Pcategory", pcategorySchema);
export default pcategoryModel;
