//asgr
import { Shoptiming } from "../../models/vendorShop/shoptiming.model.js";
import RedisCache from "../../utils/redisCache.js";
const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const AM_PM_REGEX = /^(0?[1-9]|1[0-2]):([0-5]\d)(AM|PM)$/;
const MILITARY_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const convertToMinutes = (time) => {
  time = time.trim().toUpperCase();
  const amPm = time.match(AM_PM_REGEX);
  if (amPm) {
    let hours = Number(amPm[1]);
    const minutes = Number(amPm[2]);
    if (amPm[3] === "PM" && hours !== 12) hours += 12;
    else if (amPm[3] === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } else if (MILITARY_REGEX.test(time)) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }
  return null;
};

const isValidTimeRange = (openTime, closeTime) => {
  const open = convertToMinutes(openTime);
  const close = convertToMinutes(closeTime);
  if (open === null || close === null)
    return {
      valid: false,
      message: "Time format should be HH:mm or hh:mmAM/PM",
    };
  if (open >= close)
    return { valid: false, message: "openTime must be earlier than closeTime" };
  return { valid: true };
};

export const createShopTiming = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Array of days required",
      });
    }

    for (const item of data) {
      // Day valid hai ya nahi
      if (!VALID_DAYS.includes(item.day)) {
        return res.status(400).json({
          success: false,
          message: `Invalid day "${item.day}". Must be one of: ${VALID_DAYS.join(", ")}`,
        });
      }

      if (item.isOpen) {
        const v = isValidTimeRange(item.openTime, item.closeTime);
        if (!v.valid) {
          return res.status(400).json({
            success: false,
            message: `${item.day}: ${v.message}`,
          });
        }
      }
    }

    await Shoptiming.bulkWrite(
      data.map(({ day, isOpen, openTime, closeTime }) => ({
        updateOne: {
          filter: { vendorId, day },
          update: { $set: { isOpen, openTime, closeTime } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    await RedisCache.delete(`shopTimings:${vendorId}`);
    return res.status(200).json({
      success: true,
      message: "Weekly shop timing saved/updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleShopOpenStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { day, isOpen } = req.body;

    if (!day || typeof isOpen !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "day and isOpen are required",
      });
    }

    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({
        success: false,
        message: `Invalid day "${day}". Must be one of: ${VALID_DAYS.join(", ")}`,
      });
    }

    const result = await Shoptiming.updateOne(
      { vendorId, day },
      { $set: { isOpen } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Shop timing not found for ${day}`,
      });
    }
    await RedisCache.delete(`shopTimings:${vendorId}`);
    return res.status(200).json({
      success: true,
      message: isOpen
        ? `${day}: Shop opened successfully`
        : `${day}: Shop closed successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getShopTimings = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const cacheKey = `shopTimings:${vendorId}`;
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached,
      });
    }

    const timings = await Shoptiming.find(
      { vendorId },
      { _id: 0, day: 1, isOpen: 1, openTime: 1, closeTime: 1 },
    ).lean();

    if (!timings.length) {
      return res.status(404).json({
        success: false,
        message: "No shop timings found",
      });
    }

    const weekOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const sortedTimings = timings.sort(
      (a, b) => weekOrder.indexOf(a.day) - weekOrder.indexOf(b.day),
    );

    await RedisCache.set(cacheKey, sortedTimings);

    return res.status(200).json({
      success: true,
      data: sortedTimings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteShopTimingByDay = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { day } = req.params;

    if (!day) {
      return res.status(400).json({
        success: false,
        message: "Day is required",
      });
    }

    const result = await Shoptiming.deleteOne({
      vendorId,
      day,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `No timing found for ${day}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Shop timing for ${day} deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
