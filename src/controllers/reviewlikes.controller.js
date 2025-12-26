import ReviewLikes from "../models/reviewlikes.model.js";

export const getReviewLikesCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({
        message: "reviewId is required",
      });
    }

    const likesCount = await ReviewLikes.countDocuments({
      reviewId,
      isLiked: true,
    });

    return res.status(200).json({
      message: "Likes count fetched successfully",
      data: {
        reviewId,
        totalLikes: likesCount,
        requestedBy: userId || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const createLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({ message: "reviewId is required" });
    }

    const like = await ReviewLikes.findOne({ reviewId, userId });

    if (like) {
      like.isLiked = !like.isLiked; // toggle
      await like.save();

      return res.status(200).json({
        message: like.isLiked ? "Review liked" : "Review unliked",
        isLiked: like.isLiked,
      });
    }

    await ReviewLikes.create({ reviewId, userId });

    return res.status(201).json({
      message: "Review liked",
      isLiked: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
