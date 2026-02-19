import express from "express";
import { s3Uploader } from "../../middlewares/uploads.js";
import { updateCompany,getCompany } from "../../controllers/admin/company.controller.js";

const router = express.Router();

router.post("/update-company", s3Uploader().fields([
    { name: "banner", maxCount: 1 },
    { name: "headerLogo", maxCount: 1 },
    { name: "footerLogo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "loader", maxCount: 1 },
    { name: "signatory", maxCount: 1 },
    { name: "image", maxCount: 10 },
]), updateCompany);

router.get("/get-company", getCompany);

export default router;