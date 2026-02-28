import mongoose from "mongoose";
import RFQ from "../../models/vendorShop/rfq.model.js";
import Variant from "../../models/vendorShop/variant.model.js";
import Product from "../../models/vendorShop/product.model.js";
import { APIError } from "../../middlewares/errorHandler.js";
import User from "../../models/user/user.model.js";

class RFQController {
  // ================= CREATE RFQ =================
  static async createRFQ(req, res, next) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user.id;
      const body = req.body;

      if (!body.items?.length) {
        throw new APIError("RFQ items required", 400);
      }

      //  fetch BULK variants
      const variantIds = body.items.map((i) => i.variantId);

      const variants = await Variant.find({
        _id: { $in: variantIds },
        Type: "BULK",
        disable: false,
      }).lean();

      if (variants.length !== variantIds.length) {
        throw new APIError("Only BULK variants allowed", 400);
      }

      //  fetch products
      const productIds = variants.map((v) => v.productId);

      const products = await Product.find({
        _id: { $in: productIds },
        disable: false,
      }).lean();

      //  same vendor check
      const vendorId = products[0].vendorId;

      const mixedVendor = products.some(
        (p) => p.vendorId.toString() !== vendorId.toString(),
      );

      if (mixedVendor) {
        throw new APIError("All products must belong to same vendor", 400);
      }

      //  maps
      const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

      const productMap = new Map(products.map((p) => [p._id.toString(), p]));

      //  build safe snapshot items
      body.items = body.items.map((item) => {
        const v = variantMap.get(item.variantId);
        const p = productMap.get(v.productId.toString());

        if (item.quantity < (v.moq || 1)) {
          throw new APIError(`MOQ not satisfied for ${p.name}`, 400);
        }

        return {
          productId: p._id,
          productName: p.name,
          brandId: p.brandId,
          specification: p.specification,
          variantId: v._id,
          size: v.size,
          quantity: item.quantity,
          moqSnapshot: v.moq || 1,
        };
      });

      //  delivery date check
      if (new Date(body.expectedDeliveryDate) < new Date()) {
        throw new APIError("Expected delivery must be future date", 400);
      }

      const rfqNumber = `RFQ-${Date.now()}`;

      const user = await User.findById(userId).select(
        "name phone profileImage",
      );

      if (!user) throw new APIError("User not found", 404);

      const rfq = await RFQ.create(
        [
          {
            ...body,
            rfqNumber,
            userId,
            // REAL snapshot from DB
            userName: user.name,
            userImage: user.profileImage,
            userPhone: user.phone,

            vendorId,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: "RFQ sent successfully",
        data: rfq[0],
      });
    } catch (err) {
      await session.abortTransaction();
      next(err);
    } finally {
      session.endSession();
    }
  }

  // ================= VENDOR RFQs =================
  static async getVendorRFQs(req, res, next) {
    try {
      if (!req.user?.id) {
        throw new APIError("Vendor not authenticated", 401);
      }

      const rfqs = await RFQ.find({
        vendorId: req.user.id,
      })
        .populate({
          path: "userId",
          select: "name profileImage",
        })
        .select("-userPhone")
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: rfqs,
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= ADMIN RFQs =================
  static async getAdminRFQs(req, res, next) {
    try {
      const rfqs = await RFQ.find()
        .populate({
          path: "vendorId",
          select: "firstName lastName phoneNumber email",
        })
        .sort({ createdAt: -1 })
        .lean();

      const formatted = rfqs.map((rfq) => ({
        ...rfq,

        //  USER (snapshot)
        user: {
          id: rfq.userId,
          name: rfq.userName || null,
          phone: rfq.userPhone || null,
          image: rfq.userImage || null,
        },

        // VENDOR (populated)
        vendor: rfq.vendorId
          ? {
              id: rfq.vendorId._id,
              name: `${rfq.vendorId.firstName || ""} ${rfq.vendorId.lastName || ""}`.trim(),
              phone: rfq.vendorId.phoneNumber || null,
              email: rfq.vendorId.email || null,
            }
          : null,
      }));

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  // ================= GET RFQ BY ID =================
  static async getRFQById(req, res, next) {
    try {
      const { id } = req.params;

      const rfq = await RFQ.findById(id)
        .populate({
          path: "vendorId",
          select: "firstName lastName phoneNumber email",
        })
        .lean();

      if (!rfq) {
        throw new APIError("RFQ not found", 404);
      }

      const formatted = {
        ...rfq,

        user: {
          id: rfq.userId,
          name: rfq.userName || null,
          phone: rfq.userPhone || null,
          image: rfq.userImage || null,
        },

        vendor: rfq.vendorId
          ? {
              id: rfq.vendorId._id,
              name: `${rfq.vendorId.firstName || ""} ${rfq.vendorId.lastName || ""}`.trim(),
              phone: rfq.vendorId.phoneNumber || null,
              email: rfq.vendorId.email || null,
            }
          : null,
      };

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  // ================= USER RFQs =================
  static async getUserRFQs(req, res, next) {
    try {
      if (!req.user?.id) {
        throw new APIError("User not authenticated", 401);
      }

      const rfqs = await RFQ.find({
        userId: req.user.id,
      })
        .populate({
          path: "vendorId",
          select: "firstName lastName phoneNumber email",
        })
        .sort({ createdAt: -1 })
        .lean();

      const formatted = rfqs.map((rfq) => ({
        ...rfq,

        user: {
          id: rfq.userId,
          name: rfq.userName || null,
          phone: rfq.userPhone || null,
          image: rfq.userImage || null,
        },

        vendor: rfq.vendorId
          ? {
              id: rfq.vendorId._id,
              name: `${rfq.vendorId.firstName || ""} ${rfq.vendorId.lastName || ""}`.trim(),
              phone: rfq.vendorId.phoneNumber || null,
              email: rfq.vendorId.email || null,
            }
          : null,
      }));

      res.json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }
}

export default RFQController;
