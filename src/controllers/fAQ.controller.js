import fAQModel from "../models/fAQ.model.js";
import mongoose from "mongoose";

export const createFAQ = async (req, res, next) => {
  try {
    const { question, answer, isActive = true } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and Answer are required",
      });
    }

    const existQuestion = await fAQModel.findOne({
      question: question.trim(),
    });

    if (existQuestion) {
      return res.status(409).json({
        success: false,
        message: "This question already exists",
      });
    }

    const faq = await fAQModel.create({
      question: question.trim(),
      answer: answer.trim(),
      isActive,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllfAQ = async (req, res, next) => {
  try {
    const faqs = await fAQModel
      .find({ isActive: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: faqs.length,
      data: faqs,
    });
  } catch (error) {
    next(error);
  }
};

export const updatefAQById = async (req, res, next) => {
  try {
    const { faqId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID",
      });
    }

    const updatedFAQ = await fAQModel.findByIdAndUpdate(faqId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: updatedFAQ,
    });
  } catch (error) {
    next(error);
  }
};

export const deletefAQById = async (req, res, next) => {
  try {
    const { faqId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID",
      });
    }

    const deletedFAQ = await fAQModel.findByIdAndDelete(faqId);

    if (!deletedFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getfAQById = async (req, res, next) => {
  try {
    const { faqId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(faqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID",
      });
    }

    const faq = await fAQModel.findById(faqId);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

export const toggle = async (req, res, next) => {
  try {
    const { faqId } = req.params;

    const faq = await fAQModel.findById(faqId);

    if (!faq) {
      throw new APIError(404, "Faq not found");
    }

    faq.isActive = !faq.isActive;
    await faq.save();

    res.status(200).json({
      success: true,
      message: `Faq ${faq.isActive ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    next(error);
  }
};
