import Socialmedia from "../models/socialmedia.model.js";

export const UploadSocialMediaPhotos = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: "please enter url" });
    }

    const existUrl = await Socialmedia.findOne({ url });
    if (existUrl) {
      return res.status(400).json({ message: "url already exists" });
    }

    const data = await Socialmedia.create({ url });

    res.status(201).json({
      success: true,
      message: "url added successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSocialMediaUrls = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      Socialmedia.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Socialmedia.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      results: urls.length,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      data: urls,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeSocialMediaPhoto = async (req, res) => {
  try {
    const { postid } = req.params;

    const deletedPost = await Socialmedia.findByIdAndDelete(postid);

    if (!deletedPost) {
      return res.status(404).json({ message: "post not found" });
    }

    res.status(200).json({
      success: true,
      message: "post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleSocialMediaStatus = async (req, res) => {
  try {
    const { postid } = req.params;

    const post = await Socialmedia.findById(postid);

    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }

    // toggle
    post.isActive = !post.isActive;
    await post.save();

    res.status(200).json({
      success: true,
      message: `post ${
        post.isActive ? "activated" : "deactivated"
      } successfully`,
      data: post,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
