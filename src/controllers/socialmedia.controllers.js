import Socialmedia from "../models/socialmedia.model.js";

export const UploadSocialMediaPhotos = async (req, res) => {
  try {
    const { url } = req.body;
    const existUrl = await Socialmedia.find({ url });
    if (existUrl) return res.status(400).json({ message: "url already exist" });

    if (!url) return res.status(400).json({ message: "please enter url" });

    await Socialmedia.create({
      url,
    });

    res.status(201).json({ message: " url added sucessfully", url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeSocialMediaPhoto = async (req, res) => {
  try {
    const { postid } = req.params;
    const socialMediaPost = await Socialmedia.find({ postid });
    if (!socialMediaPost)
      return res.status(400).json({ message: "url not exist" });

    await Socialmedia.findByIdAndDelete({ postid });
    res.status(200).json({ message: "post delete sucessfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
