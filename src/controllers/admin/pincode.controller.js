import Pincode from "../../models/admin/pincode.model.js"; //Sanvi
import { APIError } from "../../middlewares/errorHandler.js";

class PincodeController {
  //  CREATE
  static async createPincode(req, res, next) {
    try {
      const pincode = await Pincode.create(req.body);

      res.status(201).json({
        status: "success",
        data: { pincode },
      });
    } catch (err) {
      next(err);
    }
  }



  // ✅ SMART BULK CREATE
static async bulkCreatePincodes(req, res, next) {
  try {
    const { countryId, stateId, cityId, pincodes } = req.body;

    // ✅ validation
    if (!countryId || !stateId || !cityId) {
      throw new APIError("countryId, stateId and cityId are required", 400);
    }

    if (!Array.isArray(pincodes) || pincodes.length === 0) {
      throw new APIError("pincodes array is required", 400);
    }

    // ✅ prepare documents automatically
    const docs = pincodes.map((code) => ({
      code,
      countryId,
      stateId,
      cityId,
    }));

    const created = await Pincode.insertMany(docs, {
      ordered: false, // skip duplicates
    });

    res.status(201).json({
      status: "success",
      results: created.length,
      data: { pincodes: created },
    });
  } catch (err) {
    next(err);
  }
}

  //  GET ALL
  static async getPincodes(req, res, next) {
    try {
      const query = {};

      if (req.query.cityId) query.cityId = req.query.cityId;
      if (req.query.stateId) query.stateId = req.query.stateId;
      if (req.query.countryId) query.countryId = req.query.countryId;

      const pincodes = await Pincode.find(query).sort("code");

      res.json({
        status: "success",
        results: pincodes.length,
        data: { pincodes },
      });
    } catch (err) {
      next(err);
    }
  }

  //  GET SINGLE
  static async getPincode(req, res, next) {
    try {
      const pincode = await Pincode.findById(req.params.id);

      if (!pincode) throw new APIError("Pincode not found", 404);

      res.json({
        status: "success",
        data: { pincode },
      });
    } catch (err) {
      next(err);
    }
  }

  //  UPDATE
  static async updatePincode(req, res, next) {
    try {
      const pincode = await Pincode.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!pincode) throw new APIError("Pincode not found", 404);

      res.json({
        status: "success",
        data: { pincode },
      });
    } catch (err) {
      next(err);
    }
  }

  //  TOGGLE STATUS
  static async togglePincodeStatus(req, res, next) {
    try {
      const { status } = req.body;

      const pincode = await Pincode.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!pincode) throw new APIError("Pincode not found", 404);

      res.json({
        status: "success",
        message: `Pincode ${status}`,
        data: { pincode },
      });
    } catch (err) {
      next(err);
    }
  }

  //  DELETE
  static async deletePincode(req, res, next) {
    try {
      await Pincode.findByIdAndDelete(req.params.id);

      res.json({
        status: "success",
        message: "Pincode deleted",
      });
    } catch (err) {
      next(err);
    }
  }
}

export default PincodeController;