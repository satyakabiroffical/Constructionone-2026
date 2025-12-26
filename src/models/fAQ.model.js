import mongoose from "mongoose";

const fAQSchema = new mongoose.Schema({
  qestion: {
    type: String,
    trim: true,
  },
  answer: {
    type: String,
    trim: true,
  },
  isActive:{
    type:Boolean,
    default:true
  }
});

const fAQModel = mongoose.model("fAQ", fAQSchema);
export default fAQModel;
