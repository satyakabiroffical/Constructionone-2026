import LandingPage from "../../models/admin/landingPage.model.js";

// export const upsertLandingPage = async (req, res) => {
//   try {
//     const body = req.body || {};

//     // ensure base structure
//     const data = {
//       ...body,
//       home: {
//         ...(body.home || {}),
//       },
//     };

//     /**
//      * ---------------------------
//      * FILE HANDLING (S3)
//      * ---------------------------
//      * req.files because we used .fields()
//      */

//     if (req.files?.image?.[0]) {
//       data.home.image = req.files.image[0].location;
//     }

//     if (req.files?.video?.[0]) {
//       data.home.video = req.files.video[0].location;
//     }

//     if (req.files?.aboutImage?.[0]) {
//       data.about.image = req.files.aboutImage[0].location;
//     }

//     if (typeof data.about?.imageCards === "string") {
//       data.about.imageCards = JSON.parse(data.about.imageCards);
//     }

//     if (typeof data.why?.cards === "string") {
//       data.why.cards = JSON.parse(data.why.cards);
//     }

//     if (typeof data.businessRequest?.list === "string") {
//       data.businessRequest.list = JSON.parse(data.businessRequest.list);
//     }

//     if (typeof data.userReview === "string") {
//       data.userReview = JSON.parse(data.userReview);
//     }

//     if (typeof data.vendorReview === "string") {
//       data.vendorReview = JSON.parse(data.vendorReview);
//     }

//     /**
//      * ---------------------------
//      * UPSERT LOGIC
//      * ---------------------------
//      */

//     let landing = await LandingPage.findOne();

//     if (!landing) {
//       landing = await LandingPage.create(data);
//     } else {
//       landing = await LandingPage.findByIdAndUpdate(
//         landing._id,
//         { $set: data },
//         {
//           new: true,
//           runValidators: true,
//         },
//       );
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Landing page saved successfully",
//       data: landing,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const upsertLandingPage = async (req, res) => {
  try {
    const body = req.body || {};

    let landing = await LandingPage.findOne();

    if (!landing) {
      landing = new LandingPage({});
    }

    // JSON Parse
    if (typeof body.about?.imageCards === "string") {
      body.about.imageCards = JSON.parse(body.about.imageCards);
    }

    if (typeof body.why?.cards === "string") {
      body.why.cards = JSON.parse(body.why.cards);
    }

    if (typeof body.businessRequest?.list === "string") {
      body.businessRequest.list = JSON.parse(body.businessRequest.list);
    }

    if (typeof body.userReview === "string") {
      body.userReview = JSON.parse(body.userReview);
    }

    if (typeof body.vendorReview === "string") {
      body.vendorReview = JSON.parse(body.vendorReview);
    }

    // FILES
    if (req.files?.image?.[0]) {
      body.home = {
        ...(landing.home?.toObject?.() || landing.home || {}),
        ...(body.home || {}),
        image: req.files.image[0].location,
      };
    }

    if (req.files?.video?.[0]) {
      body.home = {
        ...(landing.home?.toObject?.() || landing.home || {}),
        ...(body.home || {}),
        video: req.files.video[0].location,
      };
    }

    if (req.files?.aboutImage?.[0]) {
      body.about = {
        ...(landing.about?.toObject?.() || landing.about || {}),
        ...(body.about || {}),
        image: req.files.aboutImage[0].location,
      };
    }

    // MAIN MERGE
    Object.keys(body).forEach((key) => {
      if (
        typeof body[key] === "object" &&
        !Array.isArray(body[key]) &&
        body[key] !== null
      ) {
        landing[key] = {
          ...(landing[key]?.toObject?.() || landing[key] || {}),
          ...body[key],
        };
      } else {
        landing[key] = body[key];
      }
    });

    await landing.save();

    return res.status(200).json({
      success: true,
      message: "Landing page updated successfully",
      data: landing,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getLandingPage = async (req, res) => {
  try {
    let landing = await LandingPage.findOne();

    if (!landing) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    return res.json({
      success: true,
      message: "Landing page fetched successfully",
      data: landing,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const addAboutImageCard = async (req, res) => {
  try {
    const { title, desc } = req.body;

    const landing = await LandingPage.findOne();
    if (!landing) throw new Error("Landing page not found");

    landing.about = landing.about || {};
    landing.about.imageCards = landing.about.imageCards || [];

    landing.about.imageCards.push({
      image: req.files?.image?.[0]?.location, // ✅ FIX HERE
      title,
      desc,
    });

    await landing.save();

    res.json({
      success: true,
      data: landing,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const deleteAboutImageCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const landing = await LandingPage.findOne();
    if (!landing) throw new Error("Landing page not found");

    landing.about.imageCards = landing.about.imageCards.filter(
      (card) => card._id?.toString() !== cardId,
    );

    await landing.save();

    return res.json({
      success: true,
      message: "Card deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const addWhyCard = async (req, res) => {
  try {
    const { title, subtitle, desc } = req.body;

    const landing = await LandingPage.findOne();
    if (!landing) throw new Error("Landing page not found");

    landing.why.cards.push({
      image: req.files?.image?.[0]?.location,
      title,
      subtitle,
      desc,
    });

    await landing.save();

    res.json({ success: true, data: landing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteWhyCard = async (req, res) => {
  try {
    const index = Number(req.params.index);

    const landing = await LandingPage.findOne();
    if (!landing) throw new Error("Landing page not found");

    if (!landing.why?.cards || index < 0 || index >= landing.why.cards.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid index",
      });
    }

    landing.why.cards.splice(index, 1);

    await landing.save();

    return res.json({
      success: true,
      message: "Card deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const addUserReview = async (req, res) => {
  try {
    const landing = await LandingPage.findOne();

    landing.userReview.push(req.body);

    await landing.save();

    res.json({ success: true, message: "Review added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const addVendorReview = async (req, res) => {
  try {
    const landing = await LandingPage.findOne();

    landing.vendorReview.push(req.body);

    await landing.save();

    res.json({ success: true, message: "Review added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { type, id } = req.params;
    // type = "user" OR "vendor"

    const landing = await LandingPage.findOne();
    if (!landing) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    if (type === "user") {
      landing.userReview = landing.userReview.filter(
        (review) => review._id.toString() !== id,
      );
    } else if (type === "vendor") {
      landing.vendorReview = landing.vendorReview.filter(
        (review) => review._id.toString() !== id,
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type (use user or vendor)",
      });
    }

    await landing.save();

    return res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteLandingItem = async (req, res) => {
  try {
    const { section, id } = req.params;

    const landing = await LandingPage.findOne();
    if (!landing) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    switch (section) {
      /**
       * -------------------------
       * ABOUT IMAGE CARDS
       * -------------------------
       */
      case "about":
        landing.about.imageCards = landing.about.imageCards.filter(
          (item) => item._id?.toString() !== id,
        );
        break;

      /**
       * -------------------------
       * WHY CARDS
       * -------------------------
       */
      case "why":
        landing.why.cards = landing.why.cards.filter(
          (item) => item._id?.toString() !== id,
        );
        break;

      /**
       * -------------------------
       * USER REVIEWS
       * -------------------------
       */
      case "user-review":
        landing.userReview = landing.userReview.filter(
          (item) => item._id?.toString() !== id,
        );
        break;

      /**
       * -------------------------
       * VENDOR REVIEWS
       * -------------------------
       */
      case "vendor-review":
        landing.vendorReview = landing.vendorReview.filter(
          (item) => item._id?.toString() !== id,
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid section type",
        });
    }

    await landing.save();

    return res.json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
