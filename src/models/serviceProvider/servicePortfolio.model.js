const portfolioSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: String,

    status: {
      type: String,
      enum: ["completed", "ongoing"],
      default: "completed",
    },

    image: {
      type: String,
    },
  },
  { timestamps: true },
);

export default mongoose.model("VendorPortfolio", portfolioSchema);


//exmp-data

// {
//  "vendorId": "66aa1234abcd",
//  "title": "Modern House Interior",
//  "description": "Complete interior design project",
//  "status": "completed",
//  "image": "https://cdn.com/project1.jpg"
// }