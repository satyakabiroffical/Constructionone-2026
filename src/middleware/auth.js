import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";

const authMiddleware = async (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];
  // console.log("Token:", token);
  

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    // attach user to request

  //  console.log(decoded,decoded.id);

    const user = await userModel.findById(decoded.id);

    // console.log(user);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    if (user.disable === true) {
      return res.status(403).send({
        success: false,
        message: "Your account has been disabled. Contact admin.",
      });
    }
      req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const adminMiddleware = async (req, res, nest) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // attach user to request

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
   

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
