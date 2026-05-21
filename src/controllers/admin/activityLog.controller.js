import ActivityLog from "../../models/admin/activityLog.model.js";

export const createActivityLog = async ({
  req,
  action,
  module,
  targetId = null,
  details = {},
}) => {
  try {
    await ActivityLog.create({
      adminId: req.user.mainAdminId || req.user.id,
      subAdminId: req.user.id,
      role: req.user.role,

      action,
      module,
      targetId,
      details,

      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    console.log("Activity Log Error:", err.message);
  }
};

export const getAllActivityLogs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .populate("subAdminId", " name phone email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalLogs = await ActivityLog.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Activity logs fetched successfully",
      totalLogs,
      currentPage: page,
      totalPages: Math.ceil(totalLogs / limit),
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
