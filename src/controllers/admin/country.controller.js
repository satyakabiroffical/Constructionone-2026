import Country from "../../models/admin/country.model.js";// Sanvi
import { APIError } from "../../middlewares/errorHandler.js";

class CountryController {
  // ✅ CREATE
  static async createCountry(req, res, next) {
    try {
      const country = await Country.create(req.body);
      res.status(201).json({ status: "success", data: { country } });
    } catch (err) {
      next(err);
    }
  }

  // ✅ GET ALL
  static async getCountries(req, res, next) {
    try {
      const countries = await Country.find().sort("name");
      res.json({ status: "success", data: { countries } });
    } catch (err) {
      next(err);
    }
  }

  // ✅ GET SINGLE
  static async getCountry(req, res, next) {
    try {
      const country = await Country.findById(req.params.id);
      if (!country) throw new APIError("Country not found", 404);

      res.json({ status: "success", data: { country } });
    } catch (err) {
      next(err);
    }
  }

  // ✅ UPDATE
  static async updateCountry(req, res, next) {
    try {
      const country = await Country.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!country) throw new APIError("Country not found", 404);

      res.json({ status: "success", data: { country } });
    } catch (err) {
      next(err);
    }
  }

  // ✅ TOGGLE STATUS (you were missing this 🚨)
  static async toggleCountryStatus(req, res, next) {
    try {
      const { status } = req.body;

      const country = await Country.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!country) throw new APIError("Country not found", 404);

      res.json({
        status: "success",
        message: `Country ${status}`,
        data: { country },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ DELETE
  static async deleteCountry(req, res, next) {
    try {
      await Country.findByIdAndDelete(req.params.id);
      res.json({ status: "success", message: "Country deleted" });
    } catch (err) {
      next(err);
    }
  }
}

export default CountryController;