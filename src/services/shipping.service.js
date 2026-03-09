import { v4 as uuidv4 } from "uuid";
import { generateAndSaveInvoice } from "../middlewares/pdfGenrator.js";
import { generateShippingLabelHTML } from "../utils/shippingLabelTemplate.js";
import { generateBarcodeBase64 } from "../utils/barcode.js";

export const generateShippingLabel = async (order) => {

 

    const trackingNumber = "TRK-" + uuidv4().slice(0, 8);

    order.trackingNumber = trackingNumber;

    const barcode = await generateBarcodeBase64(trackingNumber);

    const html = await generateShippingLabelHTML({
        order,
        barcode
    });

    const labelUrl = await generateAndSaveInvoice({
        html,
        code: `label-${trackingNumber}`,
    });

    return {
        trackingNumber,
        labelUrl
    };
};