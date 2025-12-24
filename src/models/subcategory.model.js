import mongoose, { mongo } from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    type:{
      type:String,
      trim:true

    },
    pCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pcategory",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
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

const subcategoryModel = mongoose.model("Subcategory", subcategorySchema);
export default subcategoryModel;
