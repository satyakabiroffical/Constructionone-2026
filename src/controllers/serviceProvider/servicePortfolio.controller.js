import ServicePortfolio from "../../models/serviceProvider/servicePortfolio.model.js";
import RedisCache from "../../utils/redisCache.js";

export const createPortfolio = async (req, res) => {
  try {
    const { title, description, status, vendorId } = req.body;
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title are required",
      });
    }

    const allowedStatus = ["completed", "ongoing"];

    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be completed or ongoing",
      });
    }

    let image = null;

    if (req.files && req.files.image && req.files.image.length > 0) {
      image = req.files.image[0].location;
    }

    const portfolio = await ServicePortfolio.create({
      vendorId: req.user.id,
      title,
      description,
      status,
      image,
    });

    await RedisCache.delete(`vendor_portfolio_${portfolio.vendorId}`);

    return res.status(201).json({
      success: true,
      message: "Portfolio created successfully",
      data: portfolio,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deletePortfolio = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const portfolio = await ServicePortfolio.findById(portfolioId);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    await ServicePortfolio.findByIdAndDelete(portfolioId);
    await RedisCache.delete(`vendor_portfolio_${portfolio.vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Portfolio deleted successfully",
    });
  } catch (error) {
    console.error("Delete Portfolio Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting portfolio",
    });
  }
};
export const getVendorPortfolios = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const cacheKey = `vendor_portfolio_${vendorId}`;

    const cached = await RedisCache.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    const portfolios = await ServicePortfolio.find({ vendorId }).sort({
      createdAt: -1,
    });

    await RedisCache.set(cacheKey, JSON.stringify(portfolios), 3600);

    return res.status(200).json({
      success: true,
      source: "db",
      count: portfolios.length,
      data: portfolios,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePortfolio = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { title, description, status } = req.body;

    const portfolio = await ServicePortfolio.findById(portfolioId);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found",
      });
    }

    const allowedStatus = ["completed", "ongoing"];

    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be completed or ongoing",
      });
    }

    // update fields
    if (title) portfolio.title = title;
    if (description) portfolio.description = description;
    if (status) portfolio.status = status;

    // update image from req.files
    if (req.files && req.files.image && req.files.image.length > 0) {
      portfolio.image = req.files.image[0].location || req.files.image[0].path;
    }

    await portfolio.save();

    await RedisCache.delete(`vendor_portfolio_${portfolio.vendorId}`);

    return res.status(200).json({
      success: true,
      message: "Portfolio updated successfully",
      data: portfolio,
    });
  } catch (error) {
    console.error("Update Portfolio Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating portfolio",
    });
  }
};
