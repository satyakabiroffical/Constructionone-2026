import mongoose from "mongoose";
import ProductType from "../../models/vendorShop/productType.model.js";
import RedisCache from "../../utils/redisCache.js";
class ProductTypeController {
  /*
    ============================
    CREATE Product Type
    Single + Bulk Create
    ============================
  */

  static async createProductType(req, res) {
    try {
      const { subcategoryId, typeName, typeNames } = req.body;

      /*
        Single Create Example:
        {
          "subcategoryId": "xxx",
          "typeName": "OPC 53"
        }

        Bulk Create Example:
        {
          "subcategoryId": "xxx",
          "typeNames": [
            "OPC 43",
            "OPC 53",
            "PPC",
            "PSC"
          ]
        }
      */

      if (!subcategoryId) {
        return res.status(400).json({
          success: false,
          message: "subcategoryId is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subcategoryId",
        });
      }

      let namesToInsert = [];

      // Single create
      if (typeName) {
        namesToInsert.push(typeName.trim());
      }

      // Bulk create
      if (Array.isArray(typeNames) && typeNames.length) {
        const cleaned = typeNames
          .map((item) => item.trim())
          .filter((item) => item);

        namesToInsert = [...namesToInsert, ...cleaned];
      }

      // Remove duplicate values from request
      namesToInsert = [...new Set(namesToInsert)];

      if (!namesToInsert.length) {
        return res.status(400).json({
          success: false,
          message: "typeName or typeNames is required",
        });
      }

      // Check existing duplicates
      const existing = await ProductType.find({
        subcategoryId,
        typeName: { $in: namesToInsert },
      });

      const existingNames = existing.map((item) => item.typeName);

      const newTypes = namesToInsert
        .filter((name) => !existingNames.includes(name))
        .map((name) => ({
          subcategoryId,
          typeName: name,
        }));

      if (!newTypes.length) {
        return res.status(400).json({
          success: false,
          message: "All Product Types already exist",
          alreadyExists: existingNames,
        });
      }

      const created = await ProductType.insertMany(newTypes);
      await RedisCache.deletePattern("home:*");

      return res.status(201).json({
        success: true,
        message: "Product Type(s) created successfully",
        createdCount: created.length,
        alreadyExists: existingNames,
        data: created,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating Product Type",
        error: error.message,
      });
    }
  }
  /*
    ============================
    GET All Product Types
    ============================
  */
  static async getAllProductTypesAdmin(req, res) {
    try {
      const { subcategoryId } = req.params;

      const { status } = req.query;

      if (status) {
        const data = await ProductType.find({ subcategoryId, status })
          .select("-__v -createdAt -updatedAt")
          // .populate("subcategoryId", "subcategoryName")
          .sort({ createdAt: -1 });
        return res.status(200).json({
          success: true,
          count: data.length,
          data,
        });
      }

      const data = await ProductType.find({ subcategoryId })
        .populate("subcategoryId", "subcategoryName")
        .sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  static async getAllProductTypes(req, res) {
    try {
      const { subcategoryId } = req.params;
      const data = await ProductType.find({ subcategoryId, status: true })
        .select("-__v -createdAt -updatedAt -status")
        // .populate("subcategoryId", "subcategoryName")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching Product Types",
        error: error.message,
      });
    }
  }

  /*
    ============================
    GET Single Product Type
    ============================
  */

  static async getSingleProductType(req, res) {
    try {
      const { id } = req.params;

      const data = await ProductType.findById(id).populate(
        "subcategoryId",
        "subcategoryName",
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Product Type not found",
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching Product Type",
        error: error.message,
      });
    }
  }

  /*
    ============================
    UPDATE Product Type
    ============================
  */

  static async updateProductType(req, res) {
    try {
      const { id } = req.params;
      const { typeName, status } = req.body;

      const updated = await ProductType.findByIdAndUpdate(
        id,
        {
          ...(typeName && { typeName: typeName.trim() }),
          ...(status !== undefined && { status }),
        },
        { new: true },
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Product Type not found",
        });
      }
      await RedisCache.deletePattern("home:*");

      return res.status(200).json({
        success: true,
        message: "Product Type updated successfully",
        data: updated,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error updating Product Type",
        error: error.message,
      });
    }
  }

  /*
    ============================
    DELETE Product Type
    ============================
  */

  static async deleteProductType(req, res) {
    try {
      const { id } = req.params;

      const deleted = await ProductType.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Product Type not found",
        });
      }

      await RedisCache.deletePattern("home:*");

      return res.status(200).json({
        success: true,
        message: "Product Type deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting Product Type",
        error: error.message,
      });
    }
  }

  static async toggleProductTypeStatus(req, res) {
    try {
      const { id } = req.params;

      const productType = await ProductType.findById(id);

      if (!productType) {
        return res.status(404).json({
          success: false,
          message: "Product Type not found",
        });
      }

      productType.status = !productType.status;

      const updated = await productType.save();
      await RedisCache.deletePattern("home:*");

      res.status(200).json({
        success: true,
        message: `Product Type ${updated.status ? "activated" : "deactivated"} successfully`,
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
export default ProductTypeController;
