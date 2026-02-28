// priyanshu

import User from "../models/user/user.model.js";
import { VendorProfile } from "../models/vendorShop/vendor.model.js";
import Product from "../models/vendorShop/product.model.js";
import Order from "../models/marketPlace/order.model.js";
import Brand from "../models/vendorShop/brand.model.js";
import Category from "../models/category/category.model.js";
import SubCategory from "../models/category/subCategory.model.js";


const searchProducts = async (query, skip, limit) => {
    const pipeline = [
        {
            $lookup: {
                from: "brands",
                localField: "brandId",
                foreignField: "_id",
                as: "brand",
            },
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "category",
            },
        },
        {
            $lookup: {
                from: "subcategories",
                localField: "subcategoryId",
                foreignField: "_id",
                as: "subcategory",
            },
        },
        { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },

        {
            $match: {
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { slug: { $regex: query, $options: "i" } },
                    { sku: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                    { "brand.name": { $regex: query, $options: "i" } },
                    { "category.name": { $regex: query, $options: "i" } },
                    { "subcategory.name": { $regex: query, $options: "i" } },
                ],
            },
        },

        { $sort: { createdAt: -1 } },

        {
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            name: 1,
                            slug: 1,
                            sku: 1,
                            thumbnail: 1,
                            varified: 1,
                            disable: 1,
                            sold: 1,
                            avgRating: 1,
                            createdAt: 1,
                            "brand.name": 1,
                            "category.name": 1,
                            "subcategory.name": 1,
                        },
                    },
                ],
                total: [{ $count: "count" }],
            },
        },
    ];

    const result = await Product.aggregate(pipeline);

    return {
        data: result[0].data,
        total: result[0].total[0]?.count || 0,
    };
};

export const globalSearchService = async (query, page = 1, limit = 10, entities = ["products"]) => {
    const skip = (page - 1) * limit;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const tasks = {};

    if (entities.includes("products")) {
        tasks.products = searchProducts(escaped, skip, limit);
    }

    if (entities.includes("users")) {
        tasks.users = Promise.all([
            User.find({
                $or: [
                    { name: regex }, { firstName: regex },
                    { lastName: regex }, { email: regex }, { phone: regex },
                ],
            })
                .select("firstName lastName name email phone role isVerified isDisabled createdAt")
                .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            User.countDocuments({
                $or: [
                    { name: regex }, { firstName: regex },
                    { lastName: regex }, { email: regex }, { phone: regex },
                ],
            }),
        ]).then(([data, total]) => ({ data, total }));
    }

    if (entities.includes("vendors")) {
        tasks.vendors = Promise.all([
            VendorProfile.find({
                $or: [
                    { firstName: regex }, { lastName: regex },
                    { email: regex }, { phoneNumber: regex },
                ],
            })
                .select("firstName lastName email phoneNumber isAdminVerified isProfileCompleted disable createdAt")
                .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            VendorProfile.countDocuments({
                $or: [
                    { firstName: regex }, { lastName: regex },
                    { email: regex }, { phoneNumber: regex },
                ],
            }),
        ]).then(([data, total]) => ({ data, total }));
    }

    if (entities.includes("orders")) {
        tasks.orders = Promise.all([
            Order.find({
                $or: [
                    { status: regex }, { paymentStatus: regex },
                    { paymentMethod: regex }, { transactionRef: regex },
                ],
            })
                .select("orderType status paymentStatus paymentMethod totalAmount transactionRef createdAt")
                .populate({ path: "userId", select: "name email phone" })
                .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Order.countDocuments({
                $or: [
                    { status: regex }, { paymentStatus: regex },
                    { paymentMethod: regex }, { transactionRef: regex },
                ],
            }),
        ]).then(([data, total]) => ({ data, total }));
    }

    // Run all entity searches in parallel
    const resolved = await Promise.all(
        Object.entries(tasks).map(async ([key, promise]) => {
            const { data, total } = await promise;
            return [
                key,
                {
                    data,
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            ];
        })
    );

    return Object.fromEntries(resolved);
};
