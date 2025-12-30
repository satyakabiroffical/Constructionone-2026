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
  },

  whatsAppNumber: {
    type: Number,
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
  email: {
    type: String,
    default: "company@gmail.com",
  },
  facebook: {
    type: String,
    default: "www.company.com",
  },
  googleMyBusiness: {
    type: String,
    default: "www.google.com",
  },
  pinterest: {
    type: String,
    default: "www.pinterest.com",
  },
  instagram: {
    type: String,
    default: "www.company.com",
  },
  linkedin: {
    type: String,
    default: "www.company.com",
  },
  twitter: {
    type: String,
    default: "www.company.com",
  },
  map: {
    lang: {
      type: Number,
      default: 24.746712898193618, 
    },
    long: {
      type: Number,
      default: 90.40926898280507,
    },
  },

  supportEmail: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
    trim: true,
  },
  loader: {
    type: String,
    default:
      "HomeService/1690967242433loader.gif",
  },
  fav_icon: {
    type: String,
    default:
      "HomeService/1690967242421logo.png",
  },
  refund_Policy: {
    type: String,
    default: "<h1>refund_Policy</h1>"
  },
  return_policy: {
    type: String,
    default: "<h1>return_policy </h1>",
  },
  gst: {
    type: String,
    default: "23BGJPG17838",
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
