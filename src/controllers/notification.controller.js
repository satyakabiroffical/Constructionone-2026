import User from "../models/user/user.model.js";  // priyanshu
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
//priyanshu

// Internal helper — NOT an HTTP handler. Call this after order creation.
export const sendOrderNotificationToUser = async (order, status) => {
  try {
    const statusMessages = {
      CONFIRMED: "Your order has been confirmed! ",
      PENDING: "Your order is pending payment.",
      CANCELLED: "Your order has been cancelled.",
      OUT_FOR_DELIVERY: "Your order is out for delivery! ",
      DELIVERED: "Your order has been delivered. Enjoy! ",
      VENDOR_CONFIRMED: "Your order has been accepted by the vendor.",
      VENDOR_CANCELLED: "Your order was rejected by the vendor.",
    };

    const message =
      statusMessages[status] ||
      `Your order status has been updated to: ${status}`;

    await notifyUser({
      userId: order.userId,
      title: "Order Update",
      message,
      type: "ORDER",
    });
  } catch (err) {
    // Never crash the main flow — just log silently
    console.error("sendOrderNotificationToUser failed:", err.message);
  }
};

// Internal helper — Send new order notification to a vendor
export const sendOrderNotificationToVendor = async (subOrder) => {
  try {
    const vendorId = subOrder.vandorId;
    const orderId = subOrder._id;
    if (!vendorId) return;

    const itemCount = subOrder.items?.length || 0;
    const amount = subOrder.totalAmount || 0;

    await Notification.create({
      vendorId,
      title: "New Order Received 🛒",
      message: `You have a new order with ${itemCount} item(s) worth ₹${amount}. Please review and confirm.`,
      type: "system",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

     await sendPushNotification({
        vendorId,
        title,
        body: message,
        type,
        orderId,
      });
  } catch (err) {
    console.error("sendOrderNotificationToVendor failed:", err.message);
  }
};

