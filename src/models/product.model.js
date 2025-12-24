import mongoose from 'mongoose';
import { APIError } from "../middleware/errorHandler.js";

const productSchema = new mongoose.Schema(
  {
     title: {
      type: String,
      // required: [true, "Product title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [150, "Title must be at most 150 characters"],
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description too long"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
    },

    salePrice: {
      type: Number,
      min: [0, "Sale price must be positive"],
      validate: {
        validator: function (value) {
          return value <= this.price;
        },
        message: "Sale price cannot be greater than price",
      },
    },

    images: {
      type: [String],
      default: [],
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },

    pCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pcategory",
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },

    soldCount: {
      type: Number,
      default: 0,
      min: [0, "Sold count cannot be negative"],
    },

    avgRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: [0, "Rating count cannot be negative"],
    },

    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },

    features: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feature",
      },
    ],

    // sku: {
    //   type: String,
    //   trim: true,
    //   sparse: true,
    // },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: {
        values: ["DRAFT", "ACTIVE", "OUT_OF_STOCK"],
        message: "Status must be DRAFT, ACTIVE or OUT_OF_STOCK",
      },
      default: "ACTIVE",
    },

    metaTitle: {
      type: String,
      maxlength: [60, "Meta title max length is 60"],
    },

    metaDescription: {
      type: String,
      maxlength: [160, "Meta description max length is 160"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


productSchema.index({ title: "text", description: "text" });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ category: 1 });


productSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.title = this.title.trim();
  }
  next();
});


productSchema.pre(/^find/, function (next) {
  if (this.getFilter().isActive === undefined) {
    this.find({ isActive: true });
  }
  next();
});


productSchema.virtual("isOutOfStock").get(function () {
  return this.stock <= 0;
});


// Error handling middleware
productSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new APIError(400, 'Name must be unique', true));
  } else if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((el) => el.message);
    next(new APIError(400, `${errors.join('. ')}`, true));
  } else {
    next(error);
  }
});

export default mongoose.model('Product', productSchema);
