const RAZORPAY = require("razorpay");

const razorpayInstance = new RAZORPAY({
    key_id: "rzp_test_Rfx6rVjyohb2Su",
    key_secret: "G1Q6luRNHJ7cTumqbR3yMHVE"
})


exports.razorpay = razorpayInstance;