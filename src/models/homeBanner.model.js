import mongoose from "mongoose";

const homeBannerSchema = new mongoose.Schema(
  {
    bannerName: {
      type: String,
      trim: true,
    },
    bannerImg: [
      {
        type: String,
        trim: true,
      },
    ],
    bannerDescription: {
      type: String,
      trim: true,
    },
    orderKey: {
      type: Number,
      trim: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    enable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const homeBannerModel = mongoose.model("homeBanner", homeBannerSchema);
export default homeBannerModel;
