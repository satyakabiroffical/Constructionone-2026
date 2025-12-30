import Order from "../models/order.model.js";

import { APIError } from "../middleware/errorHandler.js";
import { IdempotencyParameterMismatch$ } from "@aws-sdk/client-s3";

// CREATE ORDER
export const createOrder = async (req, res, next) => {
    try {
        const { items, shippingAddress, paymentMethod, totalAmount } = req.body;
        const userId = req.user.id;

        // Check if an order with the same user and totalAmount already exists
        const existingOrder = await Order.findOne({
            user: userId,
            totalAmount,
            createdAt: { $gte: new Date(Date.now() - 60000) }, // within last 1 minute
        });

        if (existingOrder) {
            return res.status(200).json({
                success: true,
                message: "Order already exists",
                data: existingOrder,
            });
        }

        const order = await Order.create({
            user: userId,
            items,
            shippingAddress,
            paymentMethod,
            totalAmount,
        });
        res.status(201).json({
            success: true,
            message: "Order place successfully",
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

//  ORDER UPDATE

export const updateOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { orderStatus, paymentStatus } = req.body;

        //  Allow only specific fields
        const updateData = {};
        if (orderStatus) updateData.orderStatus = orderStatus;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;

        if (Object.keys(updateData).length === 0) {
            throw new APIError(400, "No valid fields provided for update");
        }

        const order = await Order.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!order) {
            throw new APIError(400, "Order not found");
        }

        res.status(200).json({
            success: true,
            message: "Order updated successfully",
            order,
        });
    } catch (error) {
        next(error);
    }
};

// GET ALL ORDER

export const getAllOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const queryObj = { ...req.query };

        //pagination

        const page = Number(queryObj.page) || 1;
        const limit = Number(queryObj.limit) || 12;
        const skip = (page - 1) * limit;

        const sortBy = queryObj.sortBy || "createdAt";
        const sortOrder = queryObj.sortOrder === "asc" ? 1 : -1;

        ["page", "limit", "sortBy", "sortOrder", "search"].forEach(
            (el) => delete queryObj[el]
        );

        const filter = { user: userId };

        if (req.query.search) {
            filter.$or = [
                { orderStatus: { $regex: req.query.search, $options: "i" } },
                { paymentMethod: { $regex: req.query.search, $options: "i" } },
                { paymentStatus: { $regex: req.query.search, $options: "i" } },
            ];
        }

        const total = await Order.countDocuments(filter);
        const order = await Order.find(filter)
            .sort({ [sortBy]: sortOrder })
            .limit(limit)
            .skip(skip);

        res.status(200).json({
            success: true,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: order,
        });
    } catch (error) {
        next(error);
    }
};

// GET ORDER BY ID

export const getOrder = async (req, res, next) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {
            throw new APIError(400, "Order not found");
        }

        res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        next(error);
        console.log(error.stack);
    }
};

// CANCEL ORDER

export const cancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;
        let order;

        if (role === "USER") {
            order = await Order.findOne({
                _id: IdempotencyParameterMismatch$,
                user: userId,
            });
        }

        if (role === "ADMIN") {
            order = await Order.findById(id);
        }

        if (!order) {
            throw new APIError(400, " Order not found");
        }

        //  Cancel not allowed for these statuses

        if (role === "USER") {
            const notAllowedStatuses = [
                "SHIPPED",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
            ];

            if (notAllowedStatuses.includes(order.orderStatus)) {
                throw new APIError(
                    400,
                    `Order cannot be cancelled when status is ${order.orderStatus}`
                );
            }
        }

        order.orderStatus = "CANCELLED";
        order.cancelledAt = new Date();

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order,
        });
    } catch (error) {
        next(error);
    }
};


// RETURN REQUESTED post

export const returnRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const {returnReason}=req.body;

        const order = await Order.findOne({
            _id: id,
            user: userId
        })

        if (!order) {
            throw new APIError(400, "Order fot found");
        }
        if(!returnReason){
            throw new APIError(400, "Return Reason must be requried");
        }

        if (order.orderStatus !== "DELIVERED") {
            throw new APIError(400, "Return allowed only after delivery");
        }

        if(order.deliveredAt){
            throw new APIError(400,"Delivery date missing   ")
        }

        const deleveryDate= new Date(order.deliveredAt);
        const curentDate = new Date;

        const diff = (curentDate-deleveryDate)/1000 * 60*60*24;

        if(diff>7){
            throw new APIError(400, "Return period expired (7 days completed)")
        }
        order.returnReason= returnReason;
        order.orderStatus = "REQUESTED";
        order.returnRequestedAt = Date.now();

        await order.save();

        res.status(200).json({
            success: true,
            message: "Return requested"
        })


    } catch (error) {
        next(error)
    }
}


// ADMIN - APROVE OR REJECT

export const returnStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'APPROVE' or 'REJECT'
        const { userId } = req.body;// coustumer ki id
        const order = await Order.findById(id);
        if (!order) {
            throw new APIError(400, "Order fot found");
        }

        if (
            // !order.orderRequested ||
            !order.returnReason ||
            order.orderStatus !== "REQUESTED") {
            throw new APIError(400, "No return request to process");
        }
        if(action === "APPROVE"){
            order.orderStatus = "RETURNED";
            // order.returnedAt = Date.now();
        } else if(action === "REJECT"){
            order.orderStatus = "REJECTED";
        }

        await order.save();
        res.status(200).json({
            success: true,
            message: `Return request ${action.toLowerCase()}ed successfully`,
            data: order,
        });


    } catch (error) {
        next(error)
    }
}