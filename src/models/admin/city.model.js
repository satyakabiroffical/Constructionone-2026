import mongoose from "mongoose"; // Sanvi

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

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

citySchema.index({ stateId: 1, name: 1 }, { unique: true });

export default mongoose.model("City", citySchema);