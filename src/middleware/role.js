// admin.middleware.js
export const isAdmin = (req, res, next) => {
  try {

    // const authHeader = req.headers.authorization;

    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   return res.status(401).json({ message: "Not authenticated" });
    // }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
    
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
