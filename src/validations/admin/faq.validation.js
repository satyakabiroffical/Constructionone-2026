import Joi from 'joi';

export const createFaqSchema = Joi.object({
    question: Joi.string().required(),
    answer: Joi.string().required(),
    status: Joi.string().valid('Active', 'Inactive').default('Active'),
});

export const updateFaqSchema = Joi.object({
    question: Joi.string(),
    answer: Joi.string(),
    status: Joi.string().valid('Active', 'Inactive'),
});

export const faqIdSchema = Joi.object({
    faqId: Joi.string().required(), // You might want to add regex for ObjectID validation if strict
});
