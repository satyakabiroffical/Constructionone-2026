//asgr
import mongoose from "mongoose";

const vendorProfile = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      sparse: true,
    },
    phoneOtp: {
      codeHash: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      lastSentAt: Date,
    },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },

    governmentIdType: {
      type: String,
      enum: ["Aadhar Card", "Voter ID", "Driving License", "Other"],
    },
    governmentIdNumber: { type: String },
    uploadId: { type: String },

    aadharOtp: {
      codeHash: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      lastSentAt: Date,
    },
    isAadharVerified: {
      type: Boolean,
      default: false,
    },
    isAdminVerified: {
      type: Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    disable: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const vendorCompany = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
    },
    companyName: { type: String },
    companyType: {
      type: String,
      enum: [
        "Private Limited",
        "Public Limited",
        "Partnership",
        "Proprietorship",
        "Other",
      ],
      default: "Other",
    },
    businessCategory: {
      type: String,
      enum: ["Retail", "Wholesale", "E-commerce", "Production", "Other"],
      default: "Other",
    },
    serviceArea: {
      selectedStates: [String],
      selectedCities: [String],
      PinCodes: [String],
    },
    companyRegistrationNumber: { type: String },

    businessAddress: {
      address: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
      latitude: Number,
      longitude: Number,
    },
    gstNumber: { type: String },
    contactNumber: { type: String },
    accountHolderName: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    confirmAccountNumber: { type: String },
    ifscCode: { type: String },
    accountType: {
      type: String,
      enum: ["Saving", "Current", "NRO", "NRE", "Other"],
      default: "Other",
    },
    upiId: { type: String },
    shopImages: [String],
    certificates: [String],
    cancelledCheque: { type: String },
    companyWebsiteURl: { type: String },
    badges: [
      {
        type: String,
        enum: [
          "TOP VENDOR",
          "MOST SOLD",
          "FAST DELIVERY",
          "HIGH RATING",
          "TRUSTED SELLER",
          "ADMIN PICK",
        ],
        default: [""],
      },
    ],
  },
  { timestamps: true },
);

export const VendorProfile = mongoose.model("vendorProfile", vendorProfile);
export const VendorCompany = mongoose.model("vendorCompany", vendorCompany);
