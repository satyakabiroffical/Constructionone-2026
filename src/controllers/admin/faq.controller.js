import Faq from '../../models/faq.model.js';
import { APIError, catchAsync } from '../../middlewares/errorHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { createFaqSchema, updateFaqSchema } from '../../validations/admin/faq.validation.js';

// Create FAQ
export const createFaq = catchAsync(async (req, res, next) => {
    const { error } = createFaqSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const { question, answer, status } = req.body;

    const faq = await Faq.create({
        question,
        answer,
        status
    });

    res.status(201).json(new ApiResponse(201, faq, "FAQ created successfully"));
});

// Get All FAQs
export const getAllFaqs = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10, search, status } = req.query;

    const query = { isDeleted: false };

    if (status) {
        query.status = status;
    }

    if (search) {
        query.$or = [
            { question: { $regex: search, $options: 'i' } },
            { answer: { $regex: search, $options: 'i' } }
        ];
    }

    const faqs = await Faq.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Faq.countDocuments(query);

    res.status(200).json(new ApiResponse(200, {
        faqs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
    }, "FAQs fetched successfully"));
});

// Get Single FAQ
export const getFaqById = catchAsync(async (req, res, next) => {
    const { faqId } = req.params;

    const faq = await Faq.findOne({ _id: faqId, isDeleted: false });
    if (!faq) return next(new APIError(404, "FAQ not found"));

    res.status(200).json(new ApiResponse(200, faq, "FAQ fetched successfully"));
});

// Update FAQ
export const updateFaq = catchAsync(async (req, res, next) => {
    const { faqId } = req.params;

    const { error } = updateFaqSchema.validate(req.body);
    if (error) return next(new APIError(400, error.details[0].message));

    const faq = await Faq.findOne({ _id: faqId, isDeleted: false });
    if (!faq) return next(new APIError(404, "FAQ not found"));

    const updatedFaq = await Faq.findByIdAndUpdate(
        faqId,
        { $set: req.body },
        { new: true, runValidators: true }
    );

    res.status(200).json(new ApiResponse(200, updatedFaq, "FAQ updated successfully"));
});

// Delete FAQ (Soft Delete)
export const deleteFaq = catchAsync(async (req, res, next) => {
    const { faqId } = req.params;

    const faq = await Faq.findOne({ _id: faqId, isDeleted: false });
    if (!faq) return next(new APIError(404, "FAQ not found"));

    faq.isDeleted = true;
    await faq.save();

    res.status(200).json(new ApiResponse(200, null, "FAQ deleted successfully"));
});
