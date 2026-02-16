import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
    },
    dob: {
      type: String,
    },

    email: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true,
      trim: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    password: {
      type: String,
      select: false,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    otpType: {
      type: String,
      enum: ["login", "reset"],
    },

    otpAttempts: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isDisabled: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["USER", "SUB_ADMIN", "ADMIN"],
      default: "USER",
    },
    permissions: {
      type: [String],
      default: [],
      description:
        "Array of permission strings. ADMIN gets ['*'], SUB_ADMIN gets custom permissions, USER gets []",
    },

    lastLoginAt: {
      type: Date,
    },
    otpLastSentAt: {
      type: Date,
    },

    fcmToken: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", function (next) {
  if ((this.isNew || this.isModified("role")) && this.role === "ADMIN") {
    if (!this.permissions || this.permissions.length === 0) {
      this.permissions = ["*"];
    }
  }
  next();
});

export default mongoose.model("User", userSchema);
