import jwt from "jsonwebtoken";
import userModel from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";

// export const authMiddleware = async (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "Not authenticated" });
//   }
//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = await jwt.verify(token, process.env.JWT_SECRET);
//     const user = await userModel.findById(decoded.id);

//     if (!user) {
//       return res.status(404).send({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (user.disable === true) {
//       return res.status(403).send({
//         success: false,
//         message: "Your account has been disabled. Contact admin.",
//       });
//     }
//     req.user = {
//       id: decoded.id,
//       role: decoded.role || "",
//     };
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Query both models simultaneously
    const [user, vendor] = await Promise.all([
      userModel.findById(decoded.id),
      VendorProfile.findById(decoded.id),
    ]);

    const account = user || vendor;
    const accountType = user ? "user" : vendor ? "vendor" : null;

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    if (account.disable === true) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Contact admin.",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role || accountType,
      accountType,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const vendorMiddleware = async (req, res, next) => {
  try {
    console.log(" vendorMiddleware hit");
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await VendorProfile.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.disable) {
      return res.status(403).json({
        message: "Your account has been disabled. Contact admin.",
      });
    }

    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const adminMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sirf role check ke liye minimal fields fetch karo
    const user = await userModel.findById(decoded.id)
      .select('_id role')
      .lean();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.user = {
      id: decoded.id,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
