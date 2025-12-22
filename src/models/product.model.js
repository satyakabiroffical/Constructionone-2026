import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },

    description: {
      type: String
    },

    price: {
      type: Number,
    },

    salePrice: {
      type: Number
    },

    images: {
      type: [String],
      default: []
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory'
    },

    pCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pcategory'
    },

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand'
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },

    stock: {
      type: Number,
      default: 0
    },

    soldCount: {
      type: Number,
      default: 0
    },

    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    ratingCount: {
      type: Number,
      default: 0
    },

    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer'
    },

    features: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feature'
      }
    ],

    sku: {           //stock keeping unit.
      type: String,
      // unique: true, // uniq sku
      sparse: true
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'OUT_OF_STOCK'],
      default: 'ACTIVE'
    },

    metaTitle: {
      type: String
    },

    metaDescription: {
      type: String
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
