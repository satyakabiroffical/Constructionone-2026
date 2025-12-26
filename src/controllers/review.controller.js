import Review from "../models/review.model.js";

export const addReview = async (req, res) => {
  try {
    const { name, email, reviewMessage } = req.body;

    if (!name || !email || !reviewMessage)
      return res.status(400).json({ message: "all fields are required" });

    const reviewData = await Review.create({ name, email, reviewMessage });
    res
      .status(200)
      .json({ message: "review added sucessfully", data: reviewData });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!reviewId) return res.status(401).json({ message: "review not found" });
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const reviewData = await Review.findByIdAndDelete(reviewId);
    if (reviewData) {
      res
        .status(200)
        .json({ message: "review delete sucessfully", data: reviewData });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({ message: "Review ID is required" });
    }

    const reviewData = await Review.findByIdAndUpdate(reviewId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!reviewData) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      message: "Review updated successfully",
      data: reviewData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res
      .status(200)
      .json({ message: "Reviews fetch successfully", data: review });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllReview = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalReviews = await Review.countDocuments();

    const reviewData = await Review.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // latest first (optional)

    if (reviewData.length === 0) {
      return res.status(404).json({ message: "No reviews found" });
    }

    res.status(200).json({
      message: "Reviews fetched successfully",
      totalReviews,
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit),
      limit,
      data: reviewData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
