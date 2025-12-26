import Address from "../models/address.model.js";

import { APIError } from "../middleware/errorHandler.js";


export const createAddress = async (req, res, next) => {
    try {
        const { userId } = req.user;

        if (req.body.isDefault) {
            await Address.updateMany(
                { user: userId },
                { $set: { isDefault: false } }
            );
        }

        const address = await Address.create({
            ...req.body,
            user: userId,
        }, { new: true })

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            address
        });

    } catch (error) {
        next(error)
    }
}


export const updateAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;

        if (req.body.isDefault) {
            await Address.updateMany(
                { user: userId, isDefault: true },
                { $set: { isDefault: false } }
            )
        }

        const address = await Address.findByIdAndUpdate(id, { ...req.body },
            { new: true, runValidators: true }
        )

        if (!address) {
            throw new APIError(404, "Address not found");
        }

        res.status(201).json({
            success: true,
            message: "Address updated successfully",
            address
        });

    } catch (error) {
        next(error)
    }
}


export const getAllAddress = async (req, res, next) => {
    try {
        const { userId } = req.user;

        const addresses = await Address.find({ user: userId })
            .sort({ isDefault: -1, createdAt: -1 })
        res.status(200).json({
            success: true,
            data: addresses
        })

    } catch (error) {
        next(error)
    }
}

export const getAddress = async(req,res,next)=>{
    try {
        const {id}= req.params;
        const {userId}=req.user;

        const address= await Address.findOne({_id:id,user:userId});

        if(!address){
            throw new APIError(404,"Address not found");
        }
        res.status(200).json({
            success:true,
            data:address
        })

    } catch (error) {
        next(error)
    }
}