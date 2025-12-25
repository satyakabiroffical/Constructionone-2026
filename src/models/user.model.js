import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    phone: {
      type: Number,
    },

    phoneOtp: {
      codeHash: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      lastSentAt: Date,
    },
    image: {
      type: String,
    },

    disable: {
      type: Boolean,
      default: false,
    },

    fcmToken: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (this.isNew) {
    this.referralCode = generateReferralCode();
  }
  next();
});

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const UserModel = mongoose.model("Users", userSchema);

export default UserModel;
