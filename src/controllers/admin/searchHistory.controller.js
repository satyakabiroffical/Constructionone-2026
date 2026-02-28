//asgr
import SearchHistroy from "../../models/admin/searchHistroy.model.js";
import Product from "../../models/vendorShop/product.model.js";

//save wht users searching according to moduleId

export const logSearch = async ({ query, moduleId, userId }) => {
  if (!query && !moduleId) return;
  try {
    await SearchHistroy.create({ query, moduleId });
  } catch (err) {
    console.error("Search log failed:", err.message);
  }
};

// await logSearch({ query: q, moduleId });

export const trendingSearch = async (req, res) => {
  try {
    const { moduleId, limit = 10 } = req.query;
    const match = {};
    if (moduleId) match.moduleId = moduleId;

    const trending = await SearchHistroy.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$query",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: Math.min(Number(limit), 50) },
    ]);

    res.status(200).json(
      trending.map((t) => ({
        query: t._id,
        count: t.count,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch trending searches" });
  }
};

// get suggestproducts for user searching help
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const getSearchSuggestions = async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    if (!query || query.trim() === "") {
      return res.status(200).json({
        success: true,
        results: [],
      });
    }

    const safeQuery = escapeRegex(query.trim());
    const products = await Product.find({
      $or: [
        { name: { $regex: `^${safeQuery}`, $options: "i" } },
        { brand: { $regex: safeQuery, $options: "i" } },
        { category: { $regex: safeQuery, $options: "i" } },
      ],
    })
      .select("name thumbnail")
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      results: products.map((p) => ({
        id: p._id,
        label: p.name,
        thumbnail: p.thumbnail,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch search suggestions",
    });
  }
};
