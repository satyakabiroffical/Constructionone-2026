import City from "../../models/admin/city.model.js"; //Sanvi
import { APIError } from "../../middlewares/errorHandler.js";

class CityController {
  // ✅ CREATE
  static async createCity(req, res, next) {
    try {
      const { name, stateId, countryId } = req.body;

      // =========================
      // CHECK EXISTING CITY
      // =========================

      const existingCity = await City.findOne({
        name: name?.trim(),
        stateId,
        countryId,
      });

      if (existingCity) {
        return res.status(409).json({
          success: false,
          message: `${name} city already exists in this state`,
        });
      }

      // =========================
      // CREATE CITY
      // =========================

      const city = await City.create({
        ...req.body,
        name: name?.trim(),
      });

      return res.status(201).json({
        success: true,
        message: "City created successfully",
        data: city,
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ GET ALL
  static async getCities(req, res, next) {
    try {
      const query = {};
      if (req.query.stateId) query.stateId = req.query.stateId;
      if (req.query.countryId) query.countryId = req.query.countryId;

      const cities = await City.find(query).sort("name");

      res.json({
        status: "success",
        results: cities.length,
        data: { cities },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ GET SINGLE (was missing)
  static async getCity(req, res, next) {
    try {
      const city = await City.findById(req.params.id);

      if (!city) throw new APIError("City not found", 404);

      res.json({
        status: "success",
        data: { city },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ UPDATE
  static async updateCity(req, res, next) {
    try {
      const { name, stateId, countryId } = req.body;

      // =========================
      // CHECK DUPLICATE CITY
      // =========================

      const existingCity = await City.findOne({
        _id: { $ne: req.params.id },

        name: name?.trim(),

        stateId,

        countryId,
      });

      if (existingCity) {
        return res.status(409).json({
          success: false,
          message: `${name} city already exists in this state`,
        });
      }

      // =========================
      // UPDATE CITY
      // =========================

      const city = await City.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          name: name?.trim(),
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!city) {
        throw new APIError("City not found", 404);
      }

      return res.status(200).json({
        success: true,
        message: "City updated successfully",
        data: city,
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ TOGGLE STATUS (was missing)
  static async toggleCityStatus(req, res, next) {
    try {
      const city = await City.findById(req.params.id);

      if (!city) throw new APIError("City not found", 404);

      // Toggle between "active" and "inactive"
      city.status = city.status === "active" ? "inactive" : "active";

      await city.save();

      res.json({
        status: "success",
        message: `City ${city.status}`,
        data: { city },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ DELETE
  static async deleteCity(req, res, next) {
    try {
      await City.findByIdAndDelete(req.params.id);

      res.json({
        status: "success",
        message: "City deleted",
      });
    } catch (err) {
      next(err);
    }
  }
}

export default CityController;
