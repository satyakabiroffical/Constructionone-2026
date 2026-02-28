import Razorpay from "razorpay";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_Rfx6rVjyohb2Su",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "G1Q6luRNHJ7cTumqbR3yMHVE"
});

export default razorpayInstance;




// key_id: "rzp_test_Rfx6rVjyohb2Su",
//     key_secret: "G1Q6luRNHJ7cTumqbR3yMHVE"