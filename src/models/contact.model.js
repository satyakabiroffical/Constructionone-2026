import mongoose from "mongoose";
import { APIError } from "../middleware/errorHandler.js";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 2 characters"],
      maxlength: [50, "Name must not exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [500, "Message cannot exceed 500 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.pre("save", function (next) {
  if (this.isModified("name")) this.name = this.name.trim();
  if (this.isModified("email")) this.email = this.email.trim().toLowerCase();
  next();
});

contactSchema.post("save", function (error, doc, next) {
  if (error?.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    next(new APIError(400, messages.join(". "), true));
  } else {
    next(error);
  }
});

export default mongoose.model("Contact", contactSchema);
