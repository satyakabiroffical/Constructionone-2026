import AdminNotificationModel from "../../models/admin/adminNotification.model.js";

export const getAdminNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // =========================
    // MARK ALL AS READ
    // =========================

    await AdminNotificationModel.updateMany(
      {
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    );

    // =========================
    // GET NOTIFICATIONS
    // =========================

    const notifications = await AdminNotificationModel.find()
      .populate("userId", "firstName lastName ")
      .populate("vendorId", "firstName lastName companyName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // =========================
    // TOTAL COUNT
    // =========================

    const totalNotifications = await AdminNotificationModel.countDocuments();

    return res.status(200).json({
      success: true,

      count: notifications.length,

      unreadCount: 0,

      notifications,

      pagination: {
        total: totalNotifications,
        page,
        limit,
        totalPages: Math.ceil(totalNotifications / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    await AdminNotificationModel.updateMany(
      { isRead: false },
      {
        $set: {
          isRead: true,
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
