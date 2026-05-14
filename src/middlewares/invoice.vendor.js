import { generateAndSaveInvoice } from "./pdfGenrator.js";

/**
 * Build Vendor GST Tax Invoice
 * @param {Object} subOrder - Vendor specific sub-order
 * @param {Object} vendor - Vendor document (GST details required)
 */

// function buildVendorInvoiceHtml(subOrder, vendor) {

//     const invoiceNo = `INV-${subOrder._id.toString().slice(-6).toUpperCase()}`;
//     const invoiceDate = new Date(subOrder.createdAt).toLocaleDateString("en-IN");

//     const customer = subOrder.user || {};
//     const shipping = subOrder.shippingAddress || {};

//     const itemsHtml = (subOrder.items || []).map((item, idx) => {

//         const price = Number(item.price || 0);
//         const qty = item.quantity || 1;
//         const taxable = price * qty;

//         const gstRate = item.gstRate || 18;
//         const gstAmount = (taxable * gstRate) / 100;

//         return `
//       <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">
//         <td style="padding:10px;">${item.product?.name || "Product"}</td>
//         <td style="padding:10px;text-align:center;">${item.hsn || "-"}</td>
//         <td style="padding:10px;text-align:center;">₹${price.toFixed(2)}</td>
//         <td style="padding:10px;text-align:center;">${qty}</td>
//         <td style="padding:10px;text-align:right;">₹${taxable.toFixed(2)}</td>
//         <td style="padding:10px;text-align:right;">₹${gstAmount.toFixed(2)}</td>
//         <td style="padding:10px;text-align:right;font-weight:600;">
//           ₹${(taxable + gstAmount).toFixed(2)}
//         </td>
//       </tr>
//     `;
//     }).join("");

//     const subtotal = Number(subOrder.totalAmount || 0);
//     const gstTotal = Number(subOrder.totalGst || 0);
//     const grandTotal = subtotal + gstTotal;

//     return `
//   <!DOCTYPE html>
//   <html>
//   <head>
//     <meta charset="UTF-8"/>
//     <style>
//       body { font-family: Arial; font-size: 12px; color:#111; }
//       .wrapper { max-width: 800px; margin:auto; padding:20px; }
//       h2 { margin-bottom:5px; }
//       table { width:100%; border-collapse: collapse; margin-top:15px; }
//       th, td { border:1px solid #e5e7eb; padding:8px; }
//       th { background:#1e3a5f; color:#fff; font-size:11px; }
//       .totals { margin-top:15px; text-align:right; }
//     </style>
//   </head>
//   <body>
//   <div class="wrapper">

//     <h2>Tax Invoice</h2>
//     <p><strong>Invoice No:</strong> ${invoiceNo}</p>
//     <p><strong>Date:</strong> ${invoiceDate}</p>

//     <hr/>

//     <h4>Seller Details</h4>
//     <p>
//       ${vendor.businessName}<br/>
//       GSTIN: ${vendor.gstNumber}<br/>
//       ${vendor.address || ""}
//     </p>

//     <h4>Bill To</h4>
//     <p>
//       ${customer.name || shipping.name || ""}<br/>
//       ${shipping.addressLine1 || ""}<br/>
//       ${shipping.city || ""} ${shipping.pincode || ""}<br/>
//       GSTIN: ${customer.gstin || "Unregistered"}
//     </p>

//     <table>
//       <thead>
//         <tr>
//           <th>Product</th>
//           <th>HSN</th>
//           <th>Unit Price</th>
//           <th>Qty</th>
//           <th>Taxable Value</th>
//           <th>GST</th>
//           <th>Total</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${itemsHtml}
//       </tbody>
//     </table>

//     <div class="totals">
//       <p><strong>Subtotal:</strong> ₹${subtotal.toFixed(2)}</p>
//       <p><strong>Total GST:</strong> ₹${gstTotal.toFixed(2)}</p>
//       <p style="font-size:16px;"><strong>Grand Total:</strong> ₹${grandTotal.toFixed(2)}</p>
//     </div>

//     <p style="margin-top:30px;font-size:10px;color:#666;">
//       This is a computer generated invoice.
//     </p>

//   </div>
//   </body>
//   </html>
//   `;
// }

// function buildVendorInvoiceHtml(subOrder, vendor) {
//   const invoiceNo = `VIN-${subOrder._id.toString().slice(-6).toUpperCase()}`;
//   const invoiceDate = new Date(subOrder.createdAt).toLocaleDateString("en-IN");

//   // 👤 CUSTOMER
//   const customer = subOrder.user || {};
//   const shipping = subOrder.shippingAddress || {};

//   const customerName =
//     customer.name ||
//     `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

//   const customerAddress = [
//     shipping.addressLine,
//     shipping.city,
//     shipping.state,
//     shipping.pincode,
//   ]
//     .filter(Boolean)
//     .join(", ");

//   // 🏪 VENDOR
//   const vendorName = vendor.businessName || "Vendor";
//   const vendorAddress = vendor.address || "N/A";
//   const vendorGST = vendor.gstNumber || "N/A";

//   let subtotal = 0;
//   let gstTotal = 0;
//   let deliveryTotal = 0;

//   const itemsHtml = (subOrder.items || [])
//     .map((item, idx) => {
//       const product = item.productId || {};
//       const variant = item.variantId || {};

//       const price = Number(item.price || variant.price || 0);
//       const qty = Number(item.quantity || 1);
//       const deliveryFee = Number(item.deliveryFee || 0);

//       const taxable = price * qty;
//       const gstRate = Number(item.gstRate || 18);
//       const gst = (taxable * gstRate) / 100;

//       const total = taxable + gst + deliveryFee;

//       subtotal += taxable;
//       gstTotal += gst;
//       deliveryTotal += deliveryFee;

//       return `
//       <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">

//         <td>
//           <b>${product.name || "Product"}</b><br/>
//           <small>
//             Brand: ${product.brandId?.name || "-"}<br/>
//             Category: ${product.categoryId?.name || "-"}<br/>
//             Type: ${product.productTypeId?.map((t) => t.typeName).join(", ") || "-"}
//           </small>
//         </td>

//         <td style="text-align:center;">
//           ${variant.packageWeight || "-"} kg<br/>
//           <small>${variant.packageDimensions || "-"}</small>
//         </td>

//         <td style="text-align:center;">
//           ₹${price.toFixed(2)}
//         </td>

//         <td style="text-align:center;">
//           ${qty}
//         </td>

//         <td style="text-align:right;">
//           ₹${taxable.toFixed(2)}
//         </td>

//         <td style="text-align:right;">
//           ₹${gst.toFixed(2)}
//         </td>

//         <td style="text-align:right;font-weight:600;">
//           ₹${total.toFixed(2)}
//         </td>

//       </tr>
//     `;
//     })
//     .join("");

//   const grandTotal = subtotal + gstTotal + deliveryTotal;

//   return `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8"/>

// <style>
//   body { font-family: Arial; font-size: 12px; color:#111; }

//   .wrapper { max-width: 900px; margin:auto; padding:20px; }

//   .header {
//     display:flex;
//     justify-content:space-between;
//     border-bottom:2px solid #111;
//     padding-bottom:10px;
//   }

//   .section { margin-top:15px; }

//   .box {
//     border:1px solid #ddd;
//     padding:10px;
//     border-radius:6px;
//   }

//   table {
//     width:100%;
//     border-collapse: collapse;
//     margin-top:15px;
//   }

//   th, td {
//     border:1px solid #e5e7eb;
//     padding:8px;
//     font-size:12px;
//   }

//   th {
//     background:#1e3a5f;
//     color:#fff;
//   }

//   .totals {
//     text-align:right;
//     margin-top:15px;
//   }

//   .grand {
//     font-size:16px;
//     font-weight:bold;
//     border-top:2px solid #111;
//     padding-top:8px;
//   }
// </style>

// </head>

// <body>

// <div class="wrapper">

//   <!-- HEADER -->
//   <div class="header">
//     <div>
//       <h2>Vendor Tax Invoice</h2>
//       <small>ConstructionOne Marketplace</small>
//     </div>

//     <div style="text-align:right">
//       <b>Invoice No:</b> ${invoiceNo}<br/>
//       <b>Date:</b> ${invoiceDate}
//     </div>
//   </div>

//   <!-- VENDOR DETAILS -->
//   <div class="section">
//     <h4>Seller (Vendor) Details</h4>
//     <div class="box">
//       <b>${vendorName}</b><br/>
//       GSTIN: ${vendorGST}<br/>
//       Address: ${vendorAddress}
//     </div>
//   </div>

//   <!-- CUSTOMER DETAILS -->
//   <div class="section">
//     <h4>Bill To (Customer)</h4>
//     <div class="box">
//       <b>${customerName}</b><br/>
//       Email: ${customer.email || "N/A"}<br/>
//       Phone: ${customer.phone || "N/A"}<br/>
//       Address: ${customerAddress}
//     </div>
//   </div>

//   <!-- ITEMS -->
//   <div class="section">
//     <h4>Products</h4>

//     <table>
//       <thead>
//         <tr>
//           <th>Product</th>
//           <th>Variant</th>
//           <th>Price</th>
//           <th>Qty</th>
//           <th>Taxable</th>
//           <th>GST</th>
//           <th>Total</th>
//         </tr>
//       </thead>

//       <tbody>
//         ${itemsHtml || "<tr><td colspan='7'>No items</td></tr>"}
//       </tbody>
//     </table>
//   </div>

//   <!-- TOTALS -->
//   <div class="totals">
//     <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
//     <p>GST: ₹${gstTotal.toFixed(2)}</p>
//     <p>Delivery: ₹${deliveryTotal.toFixed(2)}</p>

//     <div class="grand">
//       Grand Total: ₹${grandTotal.toFixed(2)}
//     </div>
//   </div>

//   <p style="text-align:center;font-size:10px;color:gray;margin-top:20px;">
//     This is a system generated vendor invoice
//   </p>

// </div>

// </body>
// </html>
//   `;
// }

function buildVendorInvoiceHtml(subOrder, vendor) {
  const invoiceNo = `VIN-${subOrder._id.toString().slice(-6).toUpperCase()}`;
  const invoiceDate = new Date(subOrder.createdAt).toLocaleDateString("en-IN");

  // -----------------------------
  // CUSTOMER (FIXED)
  // -----------------------------
  const customer = subOrder.userId || {};
  const shipping = subOrder.shippingAddressId || {};

  const customerName =
    customer.name ||
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

  const customerEmail = customer.email || "N/A";
  const customerPhone = customer.phone || "N/A";

  const customerAddress = [
    shipping.addressLine,
    shipping.city,
    shipping.state,
    shipping.pincode,
    shipping.country,
  ]
    .filter(Boolean)
    .join(", ");

  // -----------------------------
  // TOTALS
  // -----------------------------
  let subtotal = 0;
  let gstTotal = 0;
  let deliveryTotal = 0;

  // -----------------------------
  // ITEMS
  // -----------------------------
  const itemsHtml = (subOrder.items || [])
    .map((item, idx) => {
      const product = item.productId || {};
      const variant = item.variantId || {};

      const price = Number(item.price || variant.price || 0);
      const qty = Number(item.quantity || 1);

      const deliveryFee = Number(item.deliveryFee || 0);
      const deliveryType = item.deliveryType || "-";

      const base = price * qty;
      const gstRate = Number(item.gstRate || 18);
      const gst = (base * gstRate) / 100;

      const total = base + gst + deliveryFee;

      subtotal += base;
      gstTotal += gst;
      deliveryTotal += deliveryFee;

      return `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">

        <!-- PRODUCT -->
        <td>
  <b>${product.name || "Product"}</b>

  <div style="font-size:11px;color:#555;margin-top:4px;">
    Brand: ${product.brandId?.name || "-"}<br/>
    Category: ${product.pcategoryId?.name || "-"} → ${product.categoryId?.name || "-"}<br/>
    Subcategory: ${(product.subcategoryId || []).map((s) => s.name).join(", ") || "-"}<br/>
    Type: ${(product.productTypeId || []).map((t) => t.typeName).join(", ") || "-"}<br/>
    Variant: 
      Weight: ${variant.packageWeight || "-"}kg |
      Size: ${variant.packageDimensions || "-"}
  </div>
</td>

        <!-- PRICE -->
        <td style="text-align:center;">₹${price.toFixed(2)}</td>

        <!-- QTY -->
        <td style="text-align:center;">${qty}</td>

        <!-- DELIVERY TYPE -->
        <td style="text-align:center;">${deliveryType}</td>

        <!-- DELIVERY FEE -->
        <td style="text-align:center;">₹${deliveryFee.toFixed(2)}</td>

        <!-- GST -->
        <td style="text-align:center;">₹${gst.toFixed(2)}</td>

        <!-- TOTAL -->
        <td style="text-align:right;font-weight:600;">
          ₹${total.toFixed(2)}
        </td>

      </tr>
      `;
    })
    .join("");

  const grandTotal = subtotal + gstTotal + deliveryTotal;

  // -----------------------------
  // HTML
  // -----------------------------
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>

<style>
  body { font-family: Arial; font-size: 12px; margin:0; padding:20px; color:#111; }

  .wrap { max-width: 900px; margin:auto; }

  .header {
    display:flex;
    justify-content:space-between;
    border-bottom:2px solid #000;
    padding-bottom:10px;
  }

  table {
    width:100%;
    border-collapse: collapse;
    margin-top:15px;
  }

  th, td {
    border:1px solid #ddd;
    padding:8px;
    font-size:11px;
  }

  th {
    background:#111827;
    color:#fff;
  }

  .box {
    border:1px solid #ddd;
    padding:10px;
    margin-top:15px;
    border-radius:6px;
  }

  .totals {
    text-align:right;
    margin-top:15px;
  }

  .grand {
    font-size:18px;
    font-weight:bold;
    border-top:2px solid #000;
    padding-top:10px;
  }
</style>

</head>

<body>

<div class="wrap">

  <!-- HEADER -->
  <div class="header">
    <div>
      <h2>Vendor Tax Invoice</h2>
      <small>ConstructionOne Marketplace</small>
    </div>

    <div style="text-align:right">
      <b>Invoice:</b> ${invoiceNo}<br/>
      <b>Date:</b> ${invoiceDate}
    </div>
  </div>

  <!-- VENDOR -->
 <div class="box">
  <h3>Seller Details</h3>
  <b>${vendor.businessName}</b><br/>
  GSTIN: ${vendor.gstNumber || "N/A"}<br/>
  Contact: ${vendor.contactNumber || "-"}<br/>
  Reg No: ${vendor.companyRegistrationNumber || "-"}<br/>
  ${vendor.address || ""}
</div>

  <!-- CUSTOMER -->
  <div class="box">
    <h3>Customer Details</h3>
    <b>${customerName}</b><br/>
    Email: ${customerEmail}<br/>
    Phone: ${customerPhone}<br/>
    Address: ${customerAddress}
  </div>

  <!-- ITEMS -->
  <div class="box">
    <h3>Products</h3>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Delivery Type</th>
          <th>Delivery Fee</th>
          <th>GST</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${itemsHtml || "<tr><td colspan='7'>No items</td></tr>"}
      </tbody>
    </table>
  </div>

  <!-- TOTAL -->
  <div class="totals">
    <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
    <p>Delivery: ₹${deliveryTotal.toFixed(2)}</p>
    <p>GST: ₹${gstTotal.toFixed(2)}</p>

    <div class="grand">
      Grand Total: ₹${grandTotal.toFixed(2)}
    </div>
  </div>

  <p style="text-align:center;font-size:10px;color:gray;margin-top:20px;">
    This is a system generated vendor invoice
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
