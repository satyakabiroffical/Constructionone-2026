import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    trim: true,
  },

  companyAddress: {
    type: String,
    trim: true,
  },

  contactNumber: {
    type: Number,
    trim: true,
  },

  whatsAppNumber: {
    type: Number,
    trim: true,
  },
  aboutUs: {
    type: String,
    trim: true,
  },
  termsAndCondition: {
    type: String,
    trim: true,
  },
  privatePolicy: {
    type: String,
    trim: true,
  },

  supportEmail: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
    trim: true,
  },
});

companySchema.pre("save", async function (next) {
  const count = await this.constructor.countDocuments();

  if (count > 0 && this.isNew) {
    throw new Error("Only one company record allowed");
  }

  next();
});

const companyModel = mongoose.model("Company", companySchema);
export default companyModel;
