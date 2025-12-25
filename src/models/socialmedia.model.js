import mongoose from "mongoose";

const socialmediaSchema = new mongoose.Schema(
  { url: { type: String } },
  { timestamps: true }
);

export default mongoose.model("Socialmedia", socialmediaSchema);
