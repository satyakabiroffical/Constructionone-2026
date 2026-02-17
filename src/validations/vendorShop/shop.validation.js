import Joi from "joi";

const requiredMsg = field => `${field} is required`;

export const shopValidationSchema = Joi.object({
  
  vendor: Joi.string().required().messages({
    "any.required": requiredMsg("Vendor ID")
  }),

  shopName: Joi.string().required().messages({
    "any.required": requiredMsg("Shop name")
  }),

  shopType: Joi.string()
    .valid("Store", "Warehouse", "Both")
    .required()
    .messages({
      "any.only": "Shop type must be Store, Warehouse or Both"
    }),

  address: Joi.object({
    fullAddress: Joi.string().required().messages({
      "any.required": "Full address is required"
    }),
    city: Joi.string().required().messages({
      "any.required": "City is required"
    }),
    state: Joi.string().required().messages({
      "any.required": "State is required"
    }),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid pincode",
        "any.required": "Pincode is required"
      }),
    landmark: Joi.string().allow(null, "")
  }).required(),

  location: Joi.object({
    coordinates: Joi.array()
      .items(Joi.number())
      .length(2)
      .required()
      .messages({
        "array.length": "Location must contain longitude and latitude"
      })
  }).required(),

  serviceablePincodes: Joi.array()
    .items(Joi.string().pattern(/^[0-9]{6}$/))
    .min(1)
    .required()
    .messages({
      "array.min": "At least one serviceable pincode is required"
    }),

  operatingHours: Joi.string().required().messages({
    "any.required": "Operating hours are required"
  }),

  deliveryRadius: Joi.string().required().messages({
    "any.required": "Delivery radius is required"
  }),

  averageDeliveryTime: Joi.string().required().messages({
    "any.required": "Average delivery time is required"
  }),

  vehicleTypes: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      "array.min": "At least one vehicle type is required"
    }),

  loadingFacilityAvailable: Joi.boolean().required().messages({
    "any.required": "Loading facility info is required"
  }),

  dailyDispatchCapacity: Joi.string().required().messages({
    "any.required": "Daily dispatch capacity is required"
  })
});
