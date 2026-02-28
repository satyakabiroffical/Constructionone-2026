import Tax from "../../models/admin/tax.model.js";  // priyanshu    
import Company from "../../models/admin/company.model.js";
import { APIError } from "../../middlewares/errorHandler.js";

// Create Tax
export const createTax = async (req, res, next) => {
    try {
        const { percentage, status } = req.body;

        const existingTax = await Tax.findOne({ percentage });
        if (existingTax) {
            return next(new APIError(400, "Tax with this percentage already exists"));
        }

        const tax = await Tax.create({ percentage, status });

        res.status(201).json({
            success: true,
            message: "Tax created successfully",
            tax,
        });
    } catch (error) {
        next(error);
    }
};

// Get All Taxes
export const getAllTaxes = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const taxes = await Tax.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            results: taxes.length,
            taxes,
        });
    } catch (error) {
        next(error);
    }
};

// Get Tax By ID
export const getTaxById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tax = await Tax.findById(id);

        if (!tax) {
            return next(new APIError(404, "Tax not found"));
        }

        res.status(200).json({
            success: true,
            tax,
        });
    } catch (error) {
        next(error);
    }
};

// Update Tax
export const updateTax = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { percentage, status } = req.body;

        const tax = await Tax.findById(id);
        if (!tax) {
            return next(new APIError(404, "Tax not found"));
        }

        const updatedTax = await Tax.findByIdAndUpdate(
            id,
            { percentage, status },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Tax updated successfully",
            tax: updatedTax,
        });
    } catch (error) {
        next(error);
    }
};

// Delete Tax
export const deleteTax = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tax = await Tax.findByIdAndDelete(id);

        if (!tax) {
            return next(new APIError(404, "Tax not found"));
        }

        res.status(200).json({
            success: true,
            message: "Tax deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

// Apply Tax to Company
export const applyTaxToCompany = async (req, res, next) => {
    try {
        const { id } = req.params;
        const tax = await Tax.findById(id);

        if (!tax) {
            return next(new APIError(404, "Tax not found"));
        }

        let company = await Company.findOne();
        if (!company) {
            return next(new APIError(404, "Company not found"));
        }

        company.taxPercentage = tax.percentage;
        await company.save();

        res.status(200).json({
            success: true,
            message: "Tax applied to company successfully",
            data: {
                appliedTax: tax.name,
                newPercentage: company.taxPercentage
            }
        });
    } catch (error) {
        next(error);
    }
};
