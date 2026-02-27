import { Router } from "express";   // priyanshu
import { adminGlobalSearch } from "../../controllers/admin/globalSearch.controller.js";


const router = Router();

router.get("/search", adminGlobalSearch);

export default router;
