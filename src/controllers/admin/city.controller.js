import City from "../../models/admin/city.model.js"; //Sanvi
import { APIError } from "../../middlewares/errorHandler.js";
import { createActivityLog } from "./activityLog.controller.js";

class CityController {
  // CREATE
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

      // ✅ Activity Log
      await createActivityLog({
        req,
        action: "CREATE",
        module: "CITY",
        targetId: city._id,
        details: {
          cityName: city.name,
          stateId: city.stateId,
          countryId: city.countryId,
        },
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

  //  GET ALL
  static async getCities(req, res, next) {
    try {
      const query = {};
      if (req.query.stateId) query.stateId = req.query.stateId;
      if (req.query.countryId) query.countryId = req.query.countryId;
      if (req.query.status) query.status = req.query.status;

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

      // ✅ Activity Log
      await createActivityLog({
        req,
        action: "UPDATE",
        module: "CITY",
        targetId: city._id,
        details: {
          updatedFields: Object.keys(req.body),
          cityName: city.name,
        },
      });

      return res.status(200).json({
        success: true,
        message: "City updated successfully",
        data: city,
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ TOGGLE STATUS
  static async toggleCityStatus(req, res, next) {
    try {
      const city = await City.findById(req.params.id);

      if (!city) throw new APIError("City not found", 404);

      // Toggle between active/inactive
      city.status = city.status === "active" ? "inactive" : "active";

      await city.save();

      // ✅ Activity Log
      await createActivityLog({
        req,
        action: "TOGGLE_STATUS",
        module: "CITY",
        targetId: city._id,
        details: {
          newStatus: city.status,
          cityName: city.name,
        },
      });

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
      const city = await City.findByIdAndDelete(req.params.id);

      if (!city) {
        throw new APIError("City not found", 404);
      }

      // ✅ Activity Log
      await createActivityLog({
        req,
        action: "DELETE",
        module: "CITY",
        targetId: city._id,
        details: {
          cityName: city.name,
        },
      });

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
