import mongoose, { mongo } from "mongoose";

const pcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["BEAUTY","SKINCARE"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    icon: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const pcategoryModel = mongoose.model("Pcategory", pcategorySchema);
export default pcategoryModel;
