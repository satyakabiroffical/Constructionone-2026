import SearchHistroy from "../../models/admin/searchHistroy.model.js";

export const logSearch = async ({ query, moduleId, userId }) => {
  if (!query && !moduleId) return;
  try {
    await SearchHistroy.create({ query, moduleId });
  } catch (err) {
    console.error("Search log failed:", err.message);
  }
};

//homeIntegration
// router.get('/search', async (req, res) => {
//   const { q, moduleId } = req.query;

//   // log once
await logSearch({ query: q, moduleId });
//   // return actual search results
//   const results = await searchService(q, moduleId);
//   res.json(results);
// });

export const adminTrendingSearch = async (req, res) => {
  try {
    const { moduleId, limit = 10 } = req.query;
    const match = {};
    if (moduleId) match.moduleId = moduleId;

    const trending = await SearchHistory.aggregate([
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

// router.get(
//   '/admin/trending-search',
//   isAdmin,
//   adminTrendingSearch
// );
