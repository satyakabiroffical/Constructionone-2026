import Country from "../../models/admin/country.model.js"; // Sanvi
import { APIError } from "../../middlewares/errorHandler.js";
import { createActivityLog } from "./activityLog.controller.js";

class CountryController {
  //  CREATE
  static async createCountry(req, res, next) {
    try {
      const country = await Country.create(req.body);
      await createActivityLog({
        req,
        action: "CREATE",
        module: "COUNTRY",
        targetId: country._id,
        details: {
          countryName: country.name,
        },
      });
      res.status(201).json({ status: "success", data: { country } });
    } catch (err) {
      next(err);
    }
  }

  // GET ALL
  static async getCountries(req, res, next) {
    try {
      const countries = await Country.find().sort("name");
      res.json({ status: "success", data: { countries } });
    } catch (err) {
      next(err);
    }
  }

  //  GET SINGLE
  static async getCountry(req, res, next) {
    try {
      const country = await Country.findById(req.params.id);
      if (!country) throw new APIError("Country not found", 404);

      res.json({ status: "success", data: { country } });
    } catch (err) {
      next(err);
    }
  }

  //  UPDATE
  static async updateCountry(req, res, next) {
    try {
      const country = await Country.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });

      if (!country) {
        throw new APIError("Country not found", 404);
      }

      //  Activity Log
      await createActivityLog({
        req,
        action: "UPDATE",
        module: "COUNTRY",
        targetId: country._id,
        details: {
          updatedFields: Object.keys(req.body),
          countryName: country.name,
        },
      });

      res.json({
        status: "success",
        data: { country },
      });
    } catch (err) {
      next(err);
    }
  }

  //  TOGGLE STATUS
  static async toggleCountryStatus(req, res, next) {
    try {
      const country = await Country.findById(req.params.id);

      if (!country) {
        throw new APIError("Country not found", 404);
      }

      const newStatus = country.status === "active" ? "inactive" : "active";

      country.status = newStatus;

      await country.save();

      //  Activity Log
      await createActivityLog({
        req,
        action: "TOGGLE_STATUS",
        module: "COUNTRY",
        targetId: country._id,
        details: {
          newStatus,
          countryName: country.name,
        },
      });

      res.json({
        status: "success",
        message: `Country ${newStatus}`,
        data: { country },
      });
    } catch (err) {
      next(err);
    }
  }

  //  DELETE
  static async deleteCountry(req, res, next) {
    try {
      const country = await Country.findByIdAndDelete(req.params.id);

      if (!country) {
        throw new APIError("Country not found", 404);
      }

      //  Activity Log
      await createActivityLog({
        req,
        action: "DELETE",
        module: "COUNTRY",
        targetId: country._id,
        details: {
          countryName: country.name,
        },
      });

      res.json({
        status: "success",
        message: "Country deleted",
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllActiveCountries(req, res, next) {
    try {
      const countries = await Country.find({ status: "active" }).sort({
        name: 1,
      }); // optional sorting A-Z

      res.json({
        status: "success",
        results: countries.length,
        data: { countries },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default CountryController;
