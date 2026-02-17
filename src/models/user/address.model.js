//asgr

import mongoose from 'mongoose';
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    label: {
      type: String,
      enum: ['home', 'office', 'other'],
      default: 'home'
    },

    addressLine: String,
    city: String,
    country: String,

    location: {
      lat: Number,
      lng: Number
    }
  },
  { timestamps: true }
);

export default mongoose.model('Address', addressSchema);
