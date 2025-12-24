import fAQModel from "../models/fAQ.model.js";
import mongoose from "mongoose";

export const createfAQ = async (req, res, next) => {
  try {
    const fAQ = await fAQModel.create(req.body);
    res.status(200).json({
      success: true,
      message: "Question and Answer created successfully ",
      data: fAQ,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllfAQ = async (req, res, next) => {
  try {
    const faqs = await fAQModel.find().sort({ createdAt: -1 });

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
