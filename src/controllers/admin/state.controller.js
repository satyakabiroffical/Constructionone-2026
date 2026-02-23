import State from "../../models/admin/state.model.js"; //Sanvi
import { APIError } from "../../middlewares/errorHandler.js";

class StateController {
  // ✅ CREATE
  static async createState(req, res, next) {
    try {
      const state = await State.create(req.body);
      res.status(201).json({ status: "success", data: { state } });
    } catch (err) {
      next(err);
    }
  }

  // ✅ GET ALL (with country filter)
  static async getStates(req, res, next) {
    try {
      const query = {};
      if (req.query.countryId) query.countryId = req.query.countryId;

      const states = await State.find(query).sort("name");

      res.json({
        status: "success",
        results: states.length,
        data: { states },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ GET SINGLE (YOU WERE MISSING THIS)
  static async getState(req, res, next) {
    try {
      const state = await State.findById(req.params.id);

      if (!state) throw new APIError("State not found", 404);

      res.json({
        status: "success",
        data: { state },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ UPDATE
  static async updateState(req, res, next) {
    try {
      const state = await State.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!state) throw new APIError("State not found", 404);

      res.json({
        status: "success",
        data: { state },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ TOGGLE STATUS (YOU WERE MISSING THIS)
  static async toggleStateStatus(req, res, next) {
    try {
      const { status } = req.body;

      const state = await State.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!state) throw new APIError("State not found", 404);

      res.json({
        status: "success",
        message: `State ${status}`,
        data: { state },
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ DELETE
  static async deleteState(req, res, next) {
    try {
      await State.findByIdAndDelete(req.params.id);

      res.json({
        status: "success",
        message: "State deleted",
      });
    } catch (err) {
      next(err);
    }
  }
}

export default StateController;