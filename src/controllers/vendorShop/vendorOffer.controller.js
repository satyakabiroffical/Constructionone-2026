import VendorOffer from "../../models/vendorShop/vendorOffer.model.js";

// CREATE
export const createOffer = async (req, res) => {
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

    let existingOffer = await VendorOffer.findOne({
      vendrId: vendorId,
      question,
    });

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: "Offer already exists",
      });
    }
    const offer = await VendorOffer.create({
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
export const getAllOffers = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    const offers = await VendorOffer.find({
      vendrId: vendorId,
      isActive: true,
    }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//vendorProfile view
export const getAllOffersForVendor = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const offers = await VendorOffer.find({ vendrId: vendorId }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      success: true,
      count: offers.length,
      data: offers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE
export const getOfferById = async (req, res) => {
  try {
    const offer = await VendorOffer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
export const updateOffer = async (req, res) => {
  try {
    const offer = await VendorOffer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: offer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
export const deleteOffer = async (req, res) => {
  try {
    const offer = await VendorOffer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
