import BusinessRequest from "../../models/admin/businessRequest.model.js";
import categoryModel from "../../models/category/category.model.js";
// Create a new business request
export const createBusinessRequest = async (req, res) => {
  const { businessName, name, email, city, phone, sellType, description } =
    req.body;

  // Check if the email already exists in the database
  const existingRequest = await BusinessRequest.findOne({ email, phone });
  if (existingRequest) {
    return res.status(400).json({ error: "already request submitted" });
  }

  // Create a new business request
  const newRequest = new BusinessRequest({
    businessName,
    name,
    email,
    city,
    phone,
    sellType,
    description,
  });
  await newRequest.save();
  return res
    .status(201)
    .json({ message: "Business request created successfully" });
};

// Get all business requests
// export const getBusinessRequests = async (req, res) => {
//   const { page, limit } = req.query;
//   const skip = (page - 1) * limit;
//   // Retrieve all business requests with detailed information
//   const requests = await BusinessRequest.find()
//     .skip(skip)
//     .limit(limit)
//     .populate({
//       path: "sellType",
//       model: "Category",
//       select: "name",
//     })
//     .exec();

//   // Calculate the total number of requests
//   const total = await BusinessRequest.countDocuments();

//   // Calculate the number of pages
//   const pages = Math.ceil(total / limit);
//   return res.status(200).json({
//     requests,
//     total,
//     pages,
//   });
// };

export const getBusinessRequests = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const skip = (page - 1) * limit;

  // Retrieve all business requests with latest first
  const requests = await BusinessRequest.find()
    .sort({ createdAt: -1 }) // latest on top
    .skip(skip)
    .limit(limit)
    .populate({
      path: "sellType",
      model: "Category",
      select: "name",
    })
    .exec();

  // Calculate the total number of requests
  const total = await BusinessRequest.countDocuments();

  // Calculate the number of pages
  const pages = Math.ceil(total / limit);

  return res.status(200).json({
    requests,
    total,
    pages,
    currentPage: page,
  });
};

export const getBusinessRequestById = async (req, res) => {
  const { id } = req.params;

  // Retrieve the business request with detailed information
  const request = await BusinessRequest.findById(id)
    .populate("sellType", "name")
    .exec();

  if (!request) {
    return res.status(404).json({ error: "Business request not found" });
  }

  return res.status(200).json(request);
};

export const deleteBusinessRequestById = async (req, res) => {
  const { id } = req.params;

  // Check if the business request exists
  const request = await BusinessRequest.findById(id);
  if (!request) {
    return res.status(404).json({ error: "Business request not found" });
  }

  // Delete the business request
  await BusinessRequest.findByIdAndDelete(id);

  return res
    .status(200)
    .json({ message: "Business request deleted successfully" });
};

export const getAllCatogry = async (req, res) => {
  try {
    const category = await categoryModel.find().select("name").lean();
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
