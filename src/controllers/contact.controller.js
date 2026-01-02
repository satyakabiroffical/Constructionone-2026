import Contact from "../models/contact.model.js";
import { APIError } from "../middleware/errorHandler.js";

export const createContact = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;

    const contact = await Contact.create({ name, email, phone, message });
    res.status(201).json({
      status: "success",
      message: "Thank you for contacting us",
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllContact = async (req, res, next) => {
  try {
    const queryObj = { ...req.query };

    // pagination
    const page = Number(queryObj.page) || 1;
    const limit = Number(queryObj.limit) || 12;
    const skip = (page - 1) * limit;

    const sortBy = queryObj.sortBy || "-createdAt";
    const sortOrder = queryObj.sortOrder === "asc" ? 1 : -1;
    ["page", "limit", "sortBy", "sortOrder", "search"].forEach(
      (el) => delete queryObj[el]
    );

    const filter = {};

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const contact = await Contact.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip);
    const total = contact.length;

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id);

    if (!contact) {
      throw new APIError(404, "Brand not found");
    }
    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const toggle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id);

    if (!contact) {
      throw new APIError(404, "Brand not found");
    }

    contact.isActive = !contact.isActive;
    await contact.save();

    res.status(200).json({
      success: true,
      message: `contact ${contact.isActive ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    next(error);
  }
};
