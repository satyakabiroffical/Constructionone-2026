import User from "../models/user/user.model.js";
import Notification from "../models/notification.model.js";
import { notifyUser } from "../utils/notifyUser.js";

export const notifySingleUser = async (req, res) => {
  try {
    const { userId, title, message } = req.body;

    if (req.files?.image?.length) {
      const imageKey = req.files.image[0].key;
      req.body.image = imageKey;
    }

    const notificationMessage = await notifyUser({
      userId,
      title,
      message,
      image: req.body.image || " ",
    });

    res.json({
      success: true,
      message: "Notification sent to user",
      notificationMessage,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send notification" });
  }
};
export const notifyAllUsers = async (req, res, next) => {
  try {
    const { title, message } = req.body;

    if (!title && !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

    if (req.files?.image?.length) {
      const imageKey = req.files.image[0].key;
      req.body.image = imageKey;
    }
    const users = await User.find({ fcmToken: { $ne: null } });

    for (const user of users) {
      await notifyUser({
        userId: user._id,
        title,
        message,
        image: req.body.image || " ",
        type: "ADMIN",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification sent to all users",
    });
  } catch (err) {
    next(err);
  }
};
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    next(err);
  }
};
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notifications = await Notification.find({
      userId,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

//asgr