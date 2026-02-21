import mongoose from "mongoose";

const pincodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, index: true },

    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },

    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: true,
      index: true,
    },

    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

pincodeSchema.index({ code: 1, cityId: 1 }, { unique: true });

export default mongoose.model("Pincode", pincodeSchema);