// models/SearchHistory.js
import mongoose from "mongoose";
const searchHistorySchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: [true, "search query required"],
      lowercase: true,
      trim: true,
    },
    moduleId: {
      type: String,
      required: [true, "moduleId required"],
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 3, // 3 days
    },
  },
  { timestamps: false },
);

// index for fast trending queries
searchHistorySchema.index({ moduleId: 1, query: 1 });
export default mongoose.model("SearchHistory", searchHistorySchema);
