import { Router } from "express";
import { adminMiddleware } from "../../middlewares/auth.js";
import { adminTrendingSearch } from "../../controllers/admin/searchHistory.controller.js";
const router = Router();

router.get("/trending/search", adminMiddleware, adminTrendingSearch); //req.query  - moduleId, limit = 10;

export default router;
//asgr