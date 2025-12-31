import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // required: [true, "User is required"],
      index: true
    },

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Full name must be at least 3 characters"],
      maxlength: [50, "Full name cannot exceed 50 characters"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please enter a valid 10-digit Indian phone number",
      ],
    },

    addressLine: {
      type: String,
      trim: true,
      minlength: [10, "Address must be at least 10 characters"],
      maxlength: [200, "Address cannot exceed 200 characters"],
    },

    landMark: {
      type: String,
      trim: true,
      maxlength: [100, "Landmark cannot exceed 100 characters"],
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      minlength: [2, "City name too short"],
    },

    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },

    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      match: [/^[1-9][0-9]{5}$/, "Invalid Indian pincode"],
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    addressType: {
      type: String,
      enum: {
        values: ["HOME", "OFFICE"],
        message: "Address type must be HOME or OFFICE",
      },
      default: "HOME",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Address", addressSchema);
