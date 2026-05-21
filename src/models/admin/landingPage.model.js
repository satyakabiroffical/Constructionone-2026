import mongoose from "mongoose";

const imageCardSchema = new mongoose.Schema(
  {
    image: String,
    title: String,
    desc: String,
  },
  { _id: true }
);

const whyCardSchema = new mongoose.Schema(
  {
    image: String,
    title: String,
    subtitle: String,
    desc: String,
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    name: String,
    rate: { type: Number, min: 1, max: 5 },
    comment: String,
    fullAddress: String,
  },
  { _id: true }
);

const landingPageSchema = new mongoose.Schema(
  {
    home: {
      image: String,
      video: String,
      title: String,
      subtitle: String,
      desc: String,
    },

    about: {
      title: String,
      subtitle: String,
      desc: String,
      tag: String,
      imageCards: [imageCardSchema],
    },

    why: {
      title: String,
      subtitle: String,
      desc: String,
      cards: [whyCardSchema],
    },

    howWork: {
      title: String,
      subtitle: String,
      desc: String,
    },

    recordData: {
      totalUser: Number,
      totalVendor: Number,
      totalOrder: Number,
      totalCity: Number,
    },

    businessRequest: {
      title: String,
      subtitle: String,
      desc: String,
      list: [String],
    },

    userReview: [reviewSchema],
    vendorReview: [reviewSchema],
  },
  { timestamps: true }
);

export default mongoose.model("LandingPage", landingPageSchema);