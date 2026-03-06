import Service from "../../models/serviceProvider/service.model.js";
import { VendorProfile } from "../../models/vendorShop/vendor.model.js";

///vendor methods
export const addService = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendorProfile = await VendorProfile.findById(vendorId);

    if (!vendorProfile) {
      return res.status(404).json({
        success: false,
        message: "Vendor profile not found",
      });
    }
    const { title, description, priceMin, priceMax } = req.body;

    if (!title || !priceMin || !priceMax) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, priceMin, priceMax",
      });
    }

    if (parseFloat(priceMin) > parseFloat(priceMax)) {
      return res.status(400).json({
        success: false,
        message: "Minimum price cannot be greater than maximum price",
      });
    }

    const serviceImages = req.files
      ? req.files.map((file) => file.path || file.location)
      : [];

    const newService = new Service({
      vendorId,
      title,
      description: description || "",
      serviceImages,
      priceRange: {
        min: parseFloat(priceMin),
        max: parseFloat(priceMax),
      },
      isActive: true,
    });

    const savedService = await newService.save();
    return res.status(201).json({
      success: true,
      message: "Service added successfully",
      data: savedService,
    });
  } catch (error) {
    console.error("Error adding service:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add service",
      error: error.message,
    });
  }
};
export const getVendorServices = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const services = await Service.find({ vendorId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};
export const updateService = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const serviceId = req.params.serviceId;

    const service = await Service.findOne({ _id: serviceId, vendorId });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you don't have permission to update it",
      });
    }

    // Fields that can be updated
    const allowedUpdates = [
      "title",
      "description",
      "serviceImage",
      "priceRange",
      "isActive",
    ];

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validate price range if it's being updated
    if (updates.priceRange) {
      if (updates.priceRange.min > updates.priceRange.max) {
        return res.status(400).json({
          success: false,
          message: "Minimum price cannot be greater than maximum price",
        });
      }
    }

    const updatedService = await Service.findByIdAndUpdate(serviceId, updates, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};
export const deleteService = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const serviceId = req.params.serviceId;

    const service = await Service.findOneAndDelete({
      _id: serviceId,
      vendorId,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you don't have permission to delete it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};
export const toggleServiceStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const serviceId = req.params.serviceId;

    const service = await Service.findOne({ _id: serviceId, vendorId });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    service.isActive = !service.isActive;
    await service.save();

    return res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
      data: service,
    });
  } catch (error) {
    console.error("Error toggling service status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle service status",
      error: error.message,
    });
  }
};

//customer methods
export const vendorServiceForUsers = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const services = await Service.find({ vendorId }).sort({
      avgRating: -1,
      createdAt: -1,
    });
    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: error.message,
    });
  }
};
