import { Router } from "express"; // priyanshu
import { adminGlobalSearch } from "../../controllers/admin/globalSearch.controller.js";
import {
  getSearchSuggestions,
  trendingSearch,
} from "../../controllers/admin/searchHistory.controller.js";

const router = Router();

router.get("/search", adminGlobalSearch);
router.post("/search/suggestion", getSearchSuggestions);
router.get("/search/trending", trendingSearch); //trending search accoring to moduleId

export default router;
