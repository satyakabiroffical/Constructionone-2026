import mongoose from "mongoose";  // priyanshu

const taxSchema = new mongoose.Schema(
    {
       
        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
        },
    },
    { timestamps: true }
);

export default mongoose.model("Tax", taxSchema);
