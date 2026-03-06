import Slot from "../../models/serviceProvider/serviceSlot.model.js";

export const getAllSlots = async (req, res, next) => {
  try {
    const { date } = req.query;

    let selectedDate;
    if (date) {
      selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
    }

    const slots = await Slot.find().sort({ time: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = selectedDate && selectedDate.getTime() === today.getTime();

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const updatedSlots = slots.map((slot) => {
      const slotObj = slot.toObject();
      if (!isToday) return slotObj;

      const [time, modifier] = slot.time.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (modifier === "PM" && hours !== 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const slotMinutes = hours * 60 + minutes;

      if (slotMinutes < currentMinutes) {
        return {
          ...slotObj,
          isActive: false,
        };
      }

      return slotObj; // Return plain object
    });

    res.json({
      success: true,
      data: updatedSlots,
    });
  } catch (error) {
    next(error);
  }
};
export const createSlot = async (req, res, next) => {
  try {
    const { time, maxBookings } = req.body;

    if (!time || !maxBookings) {
      return res.status(400).json({
        success: false,
        message: "Time and maxBookings are required",
      });
    }
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Use hh:mm AM/PM (e.g., 10:00 AM)",
      });
    }

    const normalizeTime = (timeStr) => {
      return timeStr.toUpperCase().replace(/\s+/g, "");
    };

    const formatTime = (timeStr) => {
      const normalized = timeStr.toUpperCase().replace(/\s+/g, "");
      return normalized.replace(/(AM|PM)$/, " $1");
    };

    const normalizedTime = normalizeTime(time);
    const formattedTime = formatTime(time);

    const exists = await Slot.findOne({ normalizedTime });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Slot for ${formattedTime} is already created`,
      });
    }

    const slot = await Slot.create({
      time: formattedTime,
      normalizedTime,
      maxBookings,
    });

    res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};
export const updateSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const { time, maxBookings } = req.body;

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    if (maxBookings !== undefined && maxBookings < slot.bookedCount) {
      return res.status(400).json({
        success: false,
        message: "maxBookings cannot be less than booked count",
      });
    }

    // Prevent duplicate time
    if (time && time !== slot.time) {
      const exists = await Slot.findOne({ time });
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Another slot already exists for this time",
        });
      }
    }

    slot.time = time ?? slot.time;
    slot.maxBookings = maxBookings ?? slot.maxBookings;

    await slot.save();

    res.json({
      success: true,
      message: "Slot updated successfully",
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};
export const toggleSlotStatus = async (req, res, next) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    slot.isActive = !slot.isActive;
    await slot.save();

    res.json({
      success: true,
      message: `Slot ${
        slot.isActive ? "activated" : "deactivated"
      } successfully`,
      data: {
        slotId: slot._id,
        isActive: slot.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const deleteSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    // Safety: do not delete if already booked
    if (slot.bookedCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete slot with existing bookings",
      });
    }

    await slot.deleteOne();

    res.json({
      success: true,
      message: "Slot deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
