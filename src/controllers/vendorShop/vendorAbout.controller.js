import VendorAbout from "../../models/vendorShop/vendorAbout.model.js";

export const createAbout = async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    const vendorId = req.user.id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    let existingOffer = await VendorAbout.findOne({
      vendrId: vendorId,
      question,
    });

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: "Offer already exists",
      });
    }
    const offer = await VendorAbout.create({
      question,
      answer,
      vendrId: vendorId,
    });

    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL - user app view
export const getAllAbouts = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const abouts = await VendorAbout.find({
      vendrId: vendorId,
      isActive: true,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: abouts.length,
      data: abouts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllAboutsVendorView = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const abouts = await VendorAbout.find({ vendrId: vendorId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: abouts.length,
      data: abouts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE
export const getAboutById = async (req, res) => {
  try {
    const about = await VendorAbout.findById(req.params.id);

    if (!about) {
      return res.status(404).json({
        success: false,
        message: "About not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: about,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
export const updateAbout = async (req, res) => {
  try {
    const about = await VendorAbout.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!about) {
      return res.status(404).json({
        success: false,
        message: "About not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "About updated successfully",
      data: about,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
export const deleteAbout = async (req, res) => {
  try {
    const about = await VendorAbout.findByIdAndDelete(req.params.id);

    if (!about) {
      return res.status(404).json({
        success: false,
        message: "About not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "About deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
