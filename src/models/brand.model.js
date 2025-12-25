import mongoose from "mongoose";
import { APIError } from "../middleware/errorHandler.js";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      minlength: [2, "Brand name must be at least 2 characters"],
      maxlength: [50, "Brand name must be at most 50 characters"],
    },

    slug: {
      type: String,
      // required: [true, "Slug is required"],
      lowercase: true,
      trim: true,
    },

    logo: {
      type: String,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description too long"]
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// clean data
brandSchema.pre("save", function (next) {
  if (this.isModified("name")) this.name = this.name.trim();
  if (this.isModified("slug")) this.slug = this.slug.trim().toLowerCase();
  next();
});

// error handling
brandSchema.post("save", function (error, doc, next) {
  if (error?.code === 11000) {
    next(new APIError(400, "Brand slug must be unique", true));
  } else if (error?.name === "ValidationError") {
    const msgs = Object.values(error.errors).map(e => e.message);
    next(new APIError(400, msgs.join(". "), true));
  } else {
    next(error);
  }
});

export default mongoose.model("Brand", brandSchema);
