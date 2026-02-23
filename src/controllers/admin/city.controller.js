import City from "../../models/admin/city.model.js"; //Sanvi
import { APIError } from "../../middlewares/errorHandler.js";

class CityController {
  // ✅ CREATE
  static async createCity(req, res, next) {
    try {
      const city = await City.create(req.body);
      res.status(201).json({ status: "success", data: { city } });
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
      const city = await City.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!city) throw new APIError("City not found", 404);

      res.json({
        status: "success",
        data: { city },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ TOGGLE STATUS (was missing)
  static async toggleCityStatus(req, res, next) {
    try {
      const { status } = req.body;

      const city = await City.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!city) throw new APIError("City not found", 404);

      res.json({
        status: "success",
        message: `City ${status}`,
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