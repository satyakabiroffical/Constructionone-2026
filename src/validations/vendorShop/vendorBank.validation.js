import { body, param } from "express-validator";

import Joi from "joi";

// export const validateAddBankAccount = Joi.object({
//   accountHolderName: Joi.string().min(3).required(),
//   accountNumber: Joi.string().min(8).max(18).required(),
//   ifscCode: Joi.string().length(11).required(),
//   bankName: Joi.string().required(),
//   accountType: Joi.string()
//     .valid("Saving", "Current", "NRO", "NRE", "Other")
//     .optional(),
//   upiId: Joi.string().optional(),
// });

export const validateAddBankAccount = Joi.object({
  accountHolderName: Joi.string().min(3).required(),

  // optional bank details
  accountNumber: Joi.string().min(8).max(18).optional(),

  ifscCode: Joi.string().length(11).optional(),

  bankName: Joi.string().optional(),

  accountType: Joi.string()
    .valid("Saving", "Current", "NRO", "NRE", "Other")
    .optional(),

  // optional upi
  upiId: Joi.string().optional(),
})
  .or("upiId", "accountNumber")
  .messages({
    "object.missing": "Either UPI ID or Bank Account details are required",
  });

export const validateSetDefaultBank = Joi.object({
  bankAccountId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!value.match(/^[0-9a-fA-F]{24}$/)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "any.required": "Bank account ID is required",
      "any.invalid": "Invalid bank account ID",
    }),
});

//  Delete Bank Validation
export const validateDeleteBank = Joi.object({
  id: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!value.match(/^[0-9a-fA-F]{24}$/)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "any.required": "Bank ID is required",
      "any.invalid": "Invalid bank ID",
    }),
});

export const validateWithdrawal = Joi.object({
  bankAccountId: Joi.string()
    .optional()
    .allow(null, "")
    .custom((value, helpers) => {
      if (value && !value.match(/^[0-9a-fA-F]{24}$/)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "any.invalid": "Invalid bank account ID",
    }),

  amount: Joi.number().required().min(1).messages({
    "any.required": "Amount is required",
    "number.base": "Amount must be a number",
    "number.min": "Amount must be greater than 0",
  }),
});

export const validateUpdateBankAccount = Joi.object({
  accountHolderName: Joi.string().min(3).optional(),

  accountNumber: Joi.string().min(8).max(18).optional(),

  confirmAccountNumber: Joi.string()
    .valid(Joi.ref("accountNumber"))
    .optional()
    .messages({
      "any.only": "Confirm account number does not match",
    }),

  ifscCode: Joi.string().length(11).optional(),

  bankName: Joi.string().optional(),

  accountType: Joi.string()
    .valid("Saving", "Current", "NRO", "NRE", "Other")
    .optional(),

  upiId: Joi.string().optional().allow("", null),
})
  .or("upiId", "accountNumber")
  .messages({
    "object.missing": "Either UPI ID or Bank Account details are required",
  });
