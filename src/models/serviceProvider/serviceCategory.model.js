import mongoose from "mongoose";
//asgr
const serviceCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    icon: String,
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ServiceCategory", serviceCategorySchema);
