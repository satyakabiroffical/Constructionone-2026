import Booking from "../../models/serviceProvider/serviceBooking.model.js";
//user's method
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookingId = "BK" + Date.now() + Math.floor(Math.random() * 1000);

    const { vendorId, serviceId, bookingDate, address, slotId } = req.body;

    if (!vendorId || !serviceId || !slotId) {
      return res.status(400).json({
        success: false,
        message: "vendorId slotId and serviceId required",
      });
    }

    const booking = await Booking.create({
      bookingId,
      userId,
      vendorId,
      serviceId,
      slotId,
      bookingDate,
      address,
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//user booking history
export const bookingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const totalCount = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("vendorId", "firstName lastName skills location avgRating")
      .populate("serviceId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit),
      },

      filters: {
        status: status || "all",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
//vendor
export const acceptBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "ACCEPTED" },
      { new: true },
    ).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking accepted",
      data: booking,
    });
  } catch (error) {
    console.error("Accept booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const startService = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "STARTED" },
      { new: true },
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Service started",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const completeService = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "COMPLETED" },
      { new: true },
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Service completed",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    if (!reason) {
      return res.status(404).json({
        success: false,
        message: "reason for cancelling",
      });
    }

    const cancellableStatuses = ["PENDING", "ACCEPTED"];

    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled in ${booking.status} status`,
      });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledByUserId: userId,
        cancelledBy: userRole || "",
      },
      { new: true, runValidators: true },
    ).lean();

    // Optional: Send notification to the other party
    // if (userRole === 'user') {
    //   notifyVendor(booking.vendorId, 'Booking cancelled by user', { bookingId, reason });
    // } else {
    //   notifyUser(booking.userId, 'Booking cancelled by vendor', { bookingId, reason });
    // }

    return res.status(200).json({
      success: true,
      message: `Booking cancelled successfully by ${userRole}`,
      data: {
        bookingId: updatedBooking._id,
        status: updatedBooking.status,
        reason: updatedBooking.cancellationReason,
        cancelledBy: updatedBooking.cancelledBy,
        cancelledAt: updatedBooking.cancelledAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getVendorBookings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { vendorId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const totalCount = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .populate("userId", "firstName lastName email phone")
      .populate("serviceId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit),
      },

      filters: {
        status: status || "all",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getBookingById = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { bookingId } = req.params;

    const booking = await Booking.findOne({
      _id: bookingId,
      vendorId,
    })
      .populate("userId", "firstName lastName email phone address")
      .populate("serviceId")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
