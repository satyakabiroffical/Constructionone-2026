import fAQModel from "../models/fAQ.model.js";

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

    

  } catch (error) {
    next(error);
  }
};
