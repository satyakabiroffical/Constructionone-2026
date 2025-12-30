  import { body, param } from "express-validator";
  import { validateObjectId } from "../middleware/validation.js";

  export const orderValidation = {

    // Create Order Validation
    createOrder: [

      body("items")
        .isArray({ min: 1 })
        .withMessage("Order must contain at least one item"),

      body("items.*.product")
        .custom(validateObjectId)
        .withMessage("Invalid product ID"),

      body("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),

      body("items.*.price")
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number"),

      body("shippingAddress")
        .notEmpty()
        .withMessage("Shipping address is required"),

      body("shippingAddress.fullName")
        .trim()
        .notEmpty()
        .withMessage("Full name is required")
        .isLength({ min: 3, max: 50 })
        .withMessage("Full name must be between 3 and 50 characters"),

      body("shippingAddress.phone")
        .trim()
        .isMobilePhone("en-IN")
        .withMessage("Invalid phone number"),

      body("shippingAddress.addressLine")
        .trim()
        .notEmpty()
        .withMessage("Address line is required"),

      body("shippingAddress.city")
        .trim()
        .notEmpty()
        .withMessage("City is required"),

      body("paymentMethod")
        .isIn(["COD", "UPI", "CARD", "NET_BANKING", "WALLET", "EMI", "BANK_TRANSFER", "PAYPAL", "STRIPE",])
        .withMessage("Payment method must be COD or ONLINE and other"),
    ],

    // Order ID param validation
    orderId: [
      param("orderId")
        .custom(validateObjectId)
        .withMessage("Invalid order ID"),
    ],
  };

  export default orderValidation;
