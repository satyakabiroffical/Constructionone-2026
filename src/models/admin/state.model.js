import mongoose from "mongoose"; // Sanvi

const stateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    countryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
      index: true,
    },

    code: String,

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

stateSchema.index({ countryId: 1, name: 1 }, { unique: true });

export default mongoose.model("State", stateSchema);