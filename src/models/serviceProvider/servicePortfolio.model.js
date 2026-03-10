import mongoose from "mongoose";
const servicePortfolioSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: String,

    status: {
      type: String,
      enum: ["completed", "ongoing"],
      default: "completed",
    },

    image: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServicePortfolio", servicePortfolioSchema);
