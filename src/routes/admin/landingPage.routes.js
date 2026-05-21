import express from "express";
import {
  upsertLandingPage,
  getLandingPage,
  addAboutImageCard,
  deleteAboutImageCard,
  addWhyCard,
  deleteWhyCard,
  addUserReview,
  addVendorReview,
  deleteLandingItem,
} from "../../controllers/admin/landingPage.controller.js";
import { s3Uploader } from "../../middlewares/uploads.js";
const router = express.Router();

router.post(
  "/create-landing-page",
  s3Uploader().fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "aboutImage", maxCount: 1 },
  ]),
  upsertLandingPage,
);
router.get("/get-landing-page", getLandingPage);

router.post(
  "/add-about-image-card",
  s3Uploader().fields([{ name: "image", maxCount: 1 }]),
  addAboutImageCard,
);
router.delete("/delete-about-image-card/:cardId", deleteAboutImageCard);

router.post("/add-why-card",  s3Uploader().fields([{ name: "image", maxCount: 1 }]),
 addWhyCard);

router.delete("/delete-why-card/:index", deleteWhyCard);

router.post(
  "/add-user-review",
  addUserReview,
);
router.post(
  "/add-vendor-review",
  addVendorReview,
);

router.delete("/landing/:section/:id", deleteLandingItem);

export default router;
