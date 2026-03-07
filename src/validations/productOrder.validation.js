import { body, param } from "express-validator";
import { validateObjectId } from "../middlewares/validation.js";

const ITEM_VALID_STATUSES = [
    "PENDING", "CONFIRMED", "VENDOR_CONFIRMED", "VENDOR_CANCELLED",
    "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED",
];

export const orderValidation={
updateStatusValidation : [
  body("subOrderId").notEmpty().withMessage("subOrderId is required"),
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .isIn(ITEM_VALID_STATUSES)
    .withMessage("Invalid status"),
],
createOrderValidation : [
    body("shippingAddress")
        .notEmpty().withMessage("Shipping address is required")
        .isObject().withMessage("Shipping address must be an object"),
    body("shippingAddress.fullName")
        .notEmpty().withMessage("Full name is required"),
    body("shippingAddress.mobile")
        .notEmpty().withMessage("Mobile number is required")
        .isLength({ min: 10, max: 10 }).withMessage("Mobile number must be 10 digits"),
    body("shippingAddress.address")
        .notEmpty().withMessage("Address is required"),
    body("shippingAddress.city")
        .notEmpty().withMessage("City is required"),
    body("shippingAddress.state")
        .notEmpty().withMessage("State is required"),
    body("shippingAddress.pincode")
        .notEmpty().withMessage("Pincode is required")
        .isLength({ min: 6, max: 6 }).withMessage("Pincode must be 6 digits"),
    body("paymentMethod")
        .notEmpty().withMessage("Payment method is required")
        .isIn(["COD", "WALLET", "RAZORPAY"]).withMessage("Invalid payment method"),
]
}

