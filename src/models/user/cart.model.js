// priyanshu
import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  
  items: [
    {
      variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      unitPrice: {
        type: Number,
        required: true,
      },
      totalPrice: {
        type: Number,
        required: true,
      },
    },
  ],
  totalAmount: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("Cart", cartSchema);
