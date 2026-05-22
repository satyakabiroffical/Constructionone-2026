import ComplainRequest from "../../models/admin/complainRequest.model.js";

export const createComplainRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    const { fullname, email, phone, address, message } = req.body;

    // check if already active complaint exists
    const existing = await ComplainRequest.findOne({
      userId,
      status: { $ne: "COMPLETED" },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active complaint. Wait until it is completed.",
      });
    }

    const complaint = await ComplainRequest.create({
      userId,
      fullname,
      email,
      phone,
      address,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      data: complaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateComplainStatus = async (req, res) => {
  try {
    const { complainId } = req.params;

    const complaint = await ComplainRequest.findById(complainId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // TOGGLE FLOW
    if (complaint.status === "PENDING") {
      complaint.status = "IN_PROGRESS";
    } else if (complaint.status === "IN_PROGRESS") {
      complaint.status = "COMPLETED";
    } else {
      return res.status(400).json({
        success: false,
        message: "Complaint already completed",
      });
    }

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: complaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ADMIN: Get My Complaint
 */
export const getComplainRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const filter = { userId };

    const [data, total] = await Promise.all([
      ComplainRequest.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),

      ComplainRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteComplain = async (req, res) => {
  try {
    const { complainId } = req.params;

    const complaint = await ComplainRequest.findByIdAndDelete(complainId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }
    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
