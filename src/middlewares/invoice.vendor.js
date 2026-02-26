import { generateAndSaveInvoice } from "./pdfGenrator.js";

/**
 * Build Vendor GST Tax Invoice
 * @param {Object} subOrder - Vendor specific sub-order
 * @param {Object} vendor - Vendor document (GST details required)
 */

function buildVendorInvoiceHtml(subOrder, vendor) {

    const invoiceNo = `INV-${subOrder._id.toString().slice(-6).toUpperCase()}`;
    const invoiceDate = new Date(subOrder.createdAt).toLocaleDateString("en-IN");

    const customer = subOrder.user || {};
    const shipping = subOrder.shippingAddress || {};

    const itemsHtml = (subOrder.items || []).map((item, idx) => {

        const price = Number(item.price || 0);
        const qty = item.quantity || 1;
        const taxable = price * qty;

        const gstRate = item.gstRate || 18;
        const gstAmount = (taxable * gstRate) / 100;

        return `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">
        <td style="padding:10px;">${item.product?.name || "Product"}</td>
        <td style="padding:10px;text-align:center;">${item.hsn || "-"}</td>
        <td style="padding:10px;text-align:center;">₹${price.toFixed(2)}</td>
        <td style="padding:10px;text-align:center;">${qty}</td>
        <td style="padding:10px;text-align:right;">₹${taxable.toFixed(2)}</td>
        <td style="padding:10px;text-align:right;">₹${gstAmount.toFixed(2)}</td>
        <td style="padding:10px;text-align:right;font-weight:600;">
          ₹${(taxable + gstAmount).toFixed(2)}
        </td>
      </tr>
    `;
    }).join("");

    const subtotal = Number(subOrder.totalAmount || 0);
    const gstTotal = Number(subOrder.totalGst || 0);
    const grandTotal = subtotal + gstTotal;

    return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <style>
      body { font-family: Arial; font-size: 12px; color:#111; }
      .wrapper { max-width: 800px; margin:auto; padding:20px; }
      h2 { margin-bottom:5px; }
      table { width:100%; border-collapse: collapse; margin-top:15px; }
      th, td { border:1px solid #e5e7eb; padding:8px; }
      th { background:#1e3a5f; color:#fff; font-size:11px; }
      .totals { margin-top:15px; text-align:right; }
    </style>
  </head>
  <body>
  <div class="wrapper">

    <h2>Tax Invoice</h2>
    <p><strong>Invoice No:</strong> ${invoiceNo}</p>
    <p><strong>Date:</strong> ${invoiceDate}</p>

    <hr/>

    <h4>Seller Details</h4>
    <p>
      ${vendor.businessName}<br/>
      GSTIN: ${vendor.gstNumber}<br/>
      ${vendor.address || ""}
    </p>

    <h4>Bill To</h4>
    <p>
      ${customer.name || shipping.name || ""}<br/>
      ${shipping.addressLine1 || ""}<br/>
      ${shipping.city || ""} ${shipping.pincode || ""}<br/>
      GSTIN: ${customer.gstin || "Unregistered"}
    </p>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>HSN</th>
          <th>Unit Price</th>
          <th>Qty</th>
          <th>Taxable Value</th>
          <th>GST</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <p><strong>Subtotal:</strong> ₹${subtotal.toFixed(2)}</p>
      <p><strong>Total GST:</strong> ₹${gstTotal.toFixed(2)}</p>
      <p style="font-size:16px;"><strong>Grand Total:</strong> ₹${grandTotal.toFixed(2)}</p>
    </div>

    <p style="margin-top:30px;font-size:10px;color:#666;">
      This is a computer generated invoice.
    </p>

  </div>
  </body>
  </html>
  `;
}

/* ─────────────────────────────────────────────── */

const vendorTaxInvoice = async (subOrder, vendor) => {

    const code = `VendorInvoice/${subOrder._id.toString()}`;

    const html = buildVendorInvoiceHtml(subOrder, vendor);

    // generateAndSaveInvoice returns the full public URL
    const pdfUrl = await generateAndSaveInvoice({ html, code });

    return pdfUrl;
};

export default vendorTaxInvoice;