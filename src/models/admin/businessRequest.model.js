import mongoose from "mongoose";

const businessRequestSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    city: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    sellType: {
      type: [String],
      ref: "Category",
    },
    description: {
      type: String,
      required: true,
    },
  },

  { timestamps: true },
);

export default mongoose.model("BusinessRequest", businessRequestSchema);
