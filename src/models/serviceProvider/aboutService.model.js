import mongoose from "mongoose";

const aboutServiceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendorProfile",
      required: true,
      unique: true,
    },

    description: {
      type: String,
    },

    serviceOffers: [
      {
        type: String,
      },
    ],

    declarationMessage: {
      type: String,
    },

    experienceYears: {
      type: Number,
    },

    languages: [
      {
        type: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("AboutService", aboutServiceSchema);

//exmp-Data
// {
//   "description": "We provide professional interior design services with modern concepts and premium quality work.",

//   "serviceOffers": [
//     "Interior Design",
//     "Home Renovation",
//     "Furniture Planning",
//     "Lighting Design"
//   ],

//   "experienceYears": 5,

//   "languages": [
//     "Hindi",
//     "English"
//   ],

//   "declarationMessage": "Our mission is to deliver high-quality work with complete customer satisfaction."
// }
