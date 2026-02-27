// priyanshu
import Company from "../models/admin/company.model.js";
import redis from "../config/redis.config.js";

const calculateBillSummary = async (cartItems) => {

    if (!cartItems || cartItems.length === 0) {
        throw new Error("Cart is empty");
    }

    let company;
    const cachedCompany = await redis.get("company_settings");

    if (cachedCompany) {
        company = JSON.parse(cachedCompany);
    } else {
        company = await Company.findOne();
        if (company) {
            await redis.set("company_settings", JSON.stringify(company), "EX", 3600);
        }
    }

    if (!company) {
        throw new Error("Company settings not found");
    }

    const taxPercentage = company.taxPercentage || 0;
    const deliveryCharge = company.delivery?.productDeliveryFee || 0;
    const minDeliveryAmount = company.delivery?.minDeliveryAmount || 0;
    const handlingCharge = company.delivery?.adminCharge || 0;

    const itemsTotal = cartItems.reduce((total, item) => {
        return total + (item.unitPrice * item.quantity);
    }, 0);
     
    // const netAmount = itemsTotal;
    const finalDeliveryCharge =
        itemsTotal >= minDeliveryAmount ? 0 : deliveryCharge;

    const gstAmount = (itemsTotal * taxPercentage) / 100;

    const grandTotal =
        itemsTotal + gstAmount + finalDeliveryCharge + handlingCharge;

    return {
        itemsCount: cartItems.length,
        itemsTotal,
        taxPercentage,
        gstAmount,
        deliveryCharge: finalDeliveryCharge,
        handlingCharge,
        grandTotal
    };
};

export default calculateBillSummary;
