// priyanshu
import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  moduleId: {
    type: String,
    required: true,
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



// latest ---->asgr
// const cartSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     index: true,
//   },

//   items: [
//     {
//       moduleId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Module",
//         required: true,
//       },

//       itemId: {
//         type: mongoose.Schema.Types.ObjectId, // productId / serviceId / rentalId
//         required: true,
//       },

//       variant: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Variant", // only MATERIAL module
//       },

//       quantity: {
//         type: Number,
//         required: true,
//         default: 1,
//       },

//       unitPrice: {
//         type: Number,
//         required: true,
//       },

//       totalPrice: {
//         type: Number,
//         required: true,
//       },
//     },
//   ],

//   totalAmount: {
//     type: Number,
//     default: 0,
//   },
// },{timestamps:true});

// export default mongoose.model("Cart", cartSchema);
