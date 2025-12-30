import mongoose from "mongoose";

const socialmediaSchema = new mongoose.Schema(
  {
    url: { type: String },
    isActive: {
      type: Boolean,
      default: true,
    },
  },

  { timestamps: true }
);

export default mongoose.model("Socialmedia", socialmediaSchema);
