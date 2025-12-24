import homeBannerModel from "../models/homeBanner.model.js";

export const createBanner = async (req, res, next) => {
  try {
    const files = req.files || {};
    const bannerImg = files?.bannerImg
      ? files.bannerImg.map((file) => file.location)
      : [];

    const { bannerName, bannerDescription, orderKey } = req.body;

    const homeBanner = await homeBannerModel.create({
      orderKey,
      bannerName,
      bannerImg,
      bannerDescription,
    });

    return res.status(201).json({
      success: true,
      message: "homeBanner created successfully",
      data: homeBanner,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBanners = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.disable !== undefined) {
      filter.disable = req.query.disable === "true";
    }

    const [banners, total] = await Promise.all([
      homeBannerModel
        .find(filter)
        .sort({ orderKey: 1 })
        .skip(skip)
        .limit(limit),
      homeBannerModel.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};



export const getBannerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await homeBannerModel.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};


export const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const files = req.files || {};
    const bannerImg = files?.bannerImg
      ? files.bannerImg.map(file => file.location)
      : undefined;

    const updateData = {
      ...req.body,
    };

    if (bannerImg) {
      updateData.bannerImg = bannerImg;
    }

    const banner = await homeBannerModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};
export const toggleBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { disable } = req.body;

    const banner = await homeBannerModel.findByIdAndUpdate(
      id,
      { disable, enable: !disable },
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: disable ? "Banner disabled" : "Banner enabled",
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await homeBannerModel.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
