import orderModel from "../models/marketPlace/order.model.js";
import { VendorCompany } from "../models/vendorShop/vendor.model.js";
import { generateAndSaveInvoice } from "./pdfGenrator.js";

// function buildInvoiceHtml(order) {
//   const orderId = order._id?.toString() || "N/A";
//   const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });

//   const addr = order.shippingAddress || {};
//   const addressHtml = [
//     addr.name,
//     addr.addressLine1 || addr.address,
//     addr.addressLine2,
//     addr.city && addr.state ? `${addr.city}, ${addr.state}` : addr.city || addr.state,
//     addr.pincode || addr.zip,
//     addr.phone || addr.mobile,
//   ]
//     .filter(Boolean)
//     .join("<br/>");

//   const payBadgeColor =
//     order.paymentStatus === "PAID"
//       ? "#22c55e"
//       : order.paymentStatus === "FAILED"
//         ? "#ef4444"
//         : "#f59e0b";

//   const itemsHtml = (order.items || [])
//     .map((item, idx) => {
//       const name =
//         item.product?.name ||
//         item.product?.title ||
//         (typeof item.product === "string" ? item.product : "Product");
//       const thumbnail = item.thumbnail || item.product?.thumbnail || "";
//       const price = Number(item.price || 0).toFixed(2);
//       const qty = item.quantity || 1;
//       const subtotal = (Number(item.price || 0) * qty).toFixed(2);

//       return `
//         <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#f9fafb"}">
//           <td style="padding:12px 10px; display:flex; align-items:center; gap:10px;">
//             ${thumbnail
//           ? `<img src="${thumbnail}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;"/>`
//           : `<div style="width:40px;height:40px;background:#e5e7eb;border-radius:6px;"></div>`
//         }
//             <span style="font-size:13px;color:#111827;">${name}</span>
//           </td>
//           <td style="padding:12px 10px;text-align:center;font-size:13px;color:#374151;">₹${price}</td>
//           <td style="padding:12px 10px;text-align:center;font-size:13px;color:#374151;">${qty}</td>
//           <td style="padding:12px 10px;text-align:right;font-size:13px;font-weight:600;color:#111827;">₹${subtotal}</td>
//         </tr>`;
//     })
//     .join("");

//   const totalAmount = Number(order.totalAmount || 0).toFixed(2);
//   const netAmount = Number(order.netAmount || order.totalAmount || 0).toFixed(2);
//   const discount = (Number(order.totalAmount || 0) - Number(order.netAmount || order.totalAmount || 0)).toFixed(2);

//  return `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8"/>
// <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
// <title>Invoice #${orderId}</title>

// <style>
//   * { box-sizing: border-box; margin: 0; padding: 0; }

//   body {
//     font-family: Arial, sans-serif;
//     background: #f9fafb;
//     color: #111827;
//   }

//   .wrapper {
//     max-width: 800px;
//     margin: 20px auto;
//     background: #fff;
//     border-radius: 10px;
//     overflow: hidden;
//     border: 1px solid #e5e7eb;
//   }

//   /* HEADER */
//   .header {
//     padding: 25px 30px;
//     background: #2563eb;
//     color: #fff;
//     display: flex;
//     justify-content: space-between;
//   }

//   .brand {
//     font-size: 22px;
//     font-weight: bold;
//   }

//   .meta {
//     text-align: right;
//     font-size: 12px;
//   }

//   /* SECTION */
//   .section {
//     padding: 20px 30px;
//     border-bottom: 1px solid #e5e7eb;
//   }

//   .section h3 {
//     font-size: 14px;
//     margin-bottom: 8px;
//     color: #2563eb;
//   }

//   .box p {
//     margin: 3px 0;
//     font-size: 12px;
//   }

//   /* TABLE */
//   table {
//     width: 100%;
//     border-collapse: collapse;
//     margin-top: 10px;
//     font-size: 12px;
//   }

//   th, td {
//     border: 1px solid #e5e7eb;
//     padding: 8px;
//   }

//   th {
//     background: #f3f4f6;
//     font-weight: 600;
//   }

//   .right { text-align: right; }

//   /* TOTAL */
//   .totals {
//     padding: 20px 30px;
//   }

//   .totals-row {
//     display: flex;
//     justify-content: space-between;
//     margin-bottom: 6px;
//     font-size: 13px;
//   }

//   .grand {
//     font-size: 15px;
//     font-weight: bold;
//     border-top: 2px solid #2563eb;
//     padding-top: 8px;
//   }

//   /* FOOTER */
//   .footer {
//     padding: 15px 30px;
//     font-size: 11px;
//     text-align: center;
//     background: #f9fafb;
//     color: #6b7280;
//   }

// </style>
// </head>

// <body>
// <div class="wrapper">

//   <!-- HEADER -->
//   <div class="header">
//     <div class="brand">ConstructionOne</div>
//     <div class="meta">
//       <div><strong>Invoice No:</strong> ${orderId}</div>
//       <div><strong>Date:</strong> ${invoiceDate}</div>
//       <div><strong>Payment:</strong> ${order.paymentMethod || "—"}</div>
//       <div><strong>Status:</strong> ${order.paymentStatus || "UNPAID"}</div>
//     </div>
//   </div>

//   <!-- BILLING & SHIPPING -->
//   <div class="section">
//     <h3>Shipping Details</h3>
//     <div class="box">
//       ${addressHtml || "—"}
//     </div>
//   </div>

//   <!-- ITEMS -->
//   <div class="section">
//     <h3>Order Items</h3>

//     <table>
//       <thead>
//         <tr>
//           <th>Product</th>
//           <th class="right">Unit Price</th>
//           <th class="right">Qty</th>
//           <th class="right">Subtotal</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${itemsHtml || `<tr><td colspan="4" style="text-align:center;">No items found</td></tr>`}
//       </tbody>
//     </table>
//   </div>

//   <!-- TOTAL -->
//   <div class="totals">
//     <div class="totals-row">
//       <span>Subtotal</span>
//       <span>₹${totalAmount}</span>
//     </div>

//     ${Number(discount) > 0
//       ? `<div class="totals-row">
//            <span>Discount</span>
//            <span>- ₹${discount}</span>
//          </div>`
//       : ""
//     }

//     <div class="totals-row grand">
//       <span>Total Payable</span>
//       <span>₹${netAmount}</span>
//     </div>
//   </div>

//   <!-- FOOTER -->
//   <div class="footer">
//     Thank you for shopping with <strong>ConstructionOne</strong>.<br/>
//     This is a system generated invoice.
//   </div>

// </div>
// </body>
// </html>`;
// }

//without vendor info
// function buildInvoiceHtml(order) {
//   const invoiceNo = `INV-${order._id.toString().slice(-6).toUpperCase()}`;
//   const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN");

//   // =========================
//   // 👤 USER (as per schema)
//   // =========================
//   const user = order.userId || {};
//   const shipping = order.shippingAddressId || {};

//   const userName =
//     user.name?.trim() ||
//     `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
//     "Customer";

//   const userEmail = user.email || "N/A";
//   const userPhone = user.phone || "N/A";

//   const userAddress =
//     user.address ||
//     [
//       shipping.addressLine,
//       shipping.city,
//       shipping.state,
//       shipping.pincode,
//       shipping.country,
//     ]
//       .filter(Boolean)
//       .join(", ");

//   // =========================
//   // 💰 TOTAL CALCULATION
//   // =========================
//   let subtotal = 0;
//   let deliveryTotal = 0;
//   let gstTotal = 0;

//   // =========================
//   // 📦 ITEMS
//   // =========================
//   const itemsHtml = (order.items || [])
//     .map((item, idx) => {
//       const product = item.productId || {};
//       const vendor = item.vendorCompany || {};
//       const variant = item.variantId || {};

//       const price = Number(item.price || variant.price || 0);
//       const qty = Number(item.quantity || 1);
//       const deliveryFee = Number(item.deliveryFee || 0);

//       const base = price * qty;
//       const gstRate = Number(item.gstRate || 18);
//       const gst = (base * gstRate) / 100;

//       const total = base + gst + deliveryFee;

//       subtotal += base;
//       deliveryTotal += deliveryFee;
//       gstTotal += gst;

//       return `
//         <tr>

//           <td>${idx + 1}</td>

//           <td>
//             <b>${product.name || "Product"}</b><br/>
//             <small style="color:gray;">
//               Vendor: ${vendor.companyName || "Vendor"}<br/>
//               Category: ${product.categoryId?.name || "-"}
//             </small>
//           </td>

//           <td>${qty}</td>
//           <td>₹${price.toFixed(2)}</td>
//           <td>₹${deliveryFee.toFixed(2)}</td>
//           <td>₹${gst.toFixed(2)}</td>
//           <td><b>₹${total.toFixed(2)}</b></td>

//         </tr>
//       `;
//     })
//     .join("");

//   const grandTotal = subtotal + deliveryTotal + gstTotal;

//   // =========================
//   // 📄 HTML
//   // =========================
//   return `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8"/>

// <style>
//   body { font-family: Arial; font-size: 12px; color:#111; margin:0; padding:20px; }

//   .wrap { max-width: 900px; margin:auto; }

//   .header {
//     display:flex;
//     justify-content:space-between;
//     border-bottom:2px solid #000;
//     padding-bottom:10px;
//   }

//   table {
//     width:100%;
//     border-collapse: collapse;
//     margin-top:15px;
//   }

//   th, td {
//     border:1px solid #ddd;
//     padding:8px;
//     font-size:11px;
//   }

//   th {
//     background:#111827;
//     color:white;
//   }

//   .section { margin-top:20px; }

//   .box {
//     border:1px solid #ddd;
//     padding:10px;
//     border-radius:5px;
//   }

//   .totals {
//     text-align:right;
//     margin-top:15px;
//   }

//   .grand {
//     font-size:18px;
//     font-weight:bold;
//     border-top:2px solid #000;
//     padding-top:10px;
//   }
// </style>

// </head>

// <body>

// <div class="wrap">

//   <!-- HEADER -->
//   <div class="header">
//     <div>
//       <h2>ConstructionOne</h2>
//       <small>Marketplace Invoice</small>
//     </div>

//     <div style="text-align:right">
//       <b>Invoice:</b> ${invoiceNo}<br/>
//       <b>Date:</b> ${invoiceDate}<br/>
//       <b>Status:</b> ${order.paymentStatus || "UNPAID"}<br/>
//       <b>Payment:</b> ${order.paymentMethod || "-"}
//     </div>
//   </div>

//   <!-- CUSTOMER -->
//   <div class="section">
//     <h3>Customer Details</h3>
//     <div class="box">
//       <b>${userName}</b><br/>
//       Email: ${userEmail}<br/>
//       Phone: ${userPhone}<br/>
//       Address: ${userAddress}
//     </div>
//   </div>

//   <!-- ITEMS -->
//   <div class="section">
//     <h3>Order Items (Multi Vendor)</h3>

//     <table>
//       <thead>
//         <tr>
//           <th>#</th>
//           <th>Product / Vendor</th>
//           <th>Qty</th>
//           <th>Price</th>
//           <th>Delivery</th>
//           <th>GST</th>
//           <th>Total</th>
//         </tr>
//       </thead>

//       <tbody>
//         ${itemsHtml || "<tr><td colspan='7'>No items found</td></tr>"}
//       </tbody>
//     </table>
//   </div>

//   <!-- TOTAL -->
//   <div class="totals">
//     <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
//     <p>Delivery Fee: ₹${deliveryTotal.toFixed(2)}</p>
//     <p>GST: ₹${gstTotal.toFixed(2)}</p>

//     <div class="grand">
//       Grand Total: ₹${grandTotal.toFixed(2)}
//     </div>
//   </div>

//   <p style="text-align:center;font-size:10px;color:gray;margin-top:20px;">
//     This is a system generated invoice (ConstructionOne Marketplace)
//   </p>

// </div>

// </body>
// </html>
//   `;
// }

// function buildInvoiceHtml(order) {
//   const invoiceNo = `INV-${order._id.toString().slice(-6).toUpperCase()}`;
//   const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN");

//   // ----------------------------
//   // USER INFO
//   // ----------------------------
//   const user = order.userId || {};
//   const shipping = order.shippingAddressId || {};

//   const userName =
//     user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();

//   const userEmail = user.email || "N/A";
//   const userPhone = user.phone || "N/A";

//   const userAddress = [
//     shipping.addressLine,
//     shipping.city,
//     shipping.state,
//     shipping.pincode,
//     shipping.country,
//   ]
//     .filter(Boolean)
//     .join(", ");

//   // ----------------------------
//   // TOTALS
//   // ----------------------------
//   let subtotal = 0;
//   let deliveryTotal = 0;
//   let gstTotal = 0;

//   // ----------------------------
//   // ITEMS (MULTI VENDOR SUPPORT)
//   // ----------------------------
//   const itemsHtml = (order.items || [])
//     .map((item, idx) => {
//       const product = item.productId || {};
//       const variant = item.variantId || {};
//       const vendor = item.vendorCompany || {};

//       const price = Number(item.price || variant.price || 0);
//       const qty = Number(item.quantity || 1);

//       const deliveryFee = Number(item.deliveryFee || 0);
//       const deliveryType = item.deliveryType || "-";

//       const base = price * qty;
//       const gstRate = Number(item.gstRate || 18);
//       const gst = (base * gstRate) / 100;

//       const total = base + gst + deliveryFee;

//       subtotal += base;
//       deliveryTotal += deliveryFee;
//       gstTotal += gst;

//       return `
//       <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">

//         <!-- PRODUCT + VENDOR -->
//         <td>
//           <b>${product.name || "Product"}</b>

//           <div style="font-size:11px;color:gray;margin-top:4px;">
//             Vendor: <b>${vendor.companyName || "Vendor"}</b><br/>
//             Delivery Type: <b>${deliveryType}</b>
//           </div>
//         </td>

//         <!-- PRICE -->
//         <td style="text-align:center;">
//           ₹${price.toFixed(2)}
//         </td>

//         <!-- QTY -->
//         <td style="text-align:center;">
//           ${qty}
//         </td>

//         <!-- DELIVERY -->
//         <td style="text-align:center;">
//           ₹${deliveryFee.toFixed(2)}
//         </td>

//         <!-- GST -->
//         <td style="text-align:center;">
//           ₹${gst.toFixed(2)}
//         </td>

//         <!-- TOTAL -->
//         <td style="text-align:right;font-weight:600;">
//           ₹${total.toFixed(2)}
//         </td>

//       </tr>
//       `;
//     })
//     .join("");

//   const grandTotal = subtotal + deliveryTotal + gstTotal;

//   // ----------------------------
//   // HTML TEMPLATE
//   // ----------------------------
//   return `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8"/>

// <style>
//   body { font-family: Arial; font-size: 12px; color:#111; margin:0; padding:20px; }

//   .wrap { max-width: 950px; margin:auto; }

//   .header {
//     display:flex;
//     justify-content:space-between;
//     border-bottom:2px solid #111;
//     padding-bottom:10px;
//   }

//   table {
//     width:100%;
//     border-collapse: collapse;
//     margin-top:15px;
//   }

//   th, td {
//     border:1px solid #ddd;
//     padding:8px;
//     font-size:11px;
//   }

//   th {
//     background:#111827;
//     color:white;
//   }

//   .box {
//     border:1px solid #ddd;
//     padding:10px;
//     margin-top:15px;
//     border-radius:6px;
//   }

//   .totals {
//     text-align:right;
//     margin-top:15px;
//     font-size:13px;
//   }

//   .grand {
//     font-size:18px;
//     font-weight:bold;
//     border-top:2px solid #000;
//     padding-top:10px;
//   }
// </style>

// </head>

// <body>

// <div class="wrap">

//   <!-- HEADER -->
//   <div class="header">
//     <div>
//       <h2>ConstructionOne Marketplace</h2>
//       <small>Order Invoice</small>
//     </div>

//     <div style="text-align:right">
//       <b>Invoice:</b> ${invoiceNo}<br/>
//       <b>Date:</b> ${invoiceDate}<br/>
//       <b>Status:</b> ${order.paymentStatus || "UNPAID"}<br/>
//       <b>Payment:</b> ${order.paymentMethod || "-"}
//     </div>
//   </div>

//   <!-- CUSTOMER -->
//   <div class="box">
//     <h3>Customer Details</h3>
//     <b>${userName}</b><br/>
//     Email: ${userEmail}<br/>
//     Phone: ${userPhone}<br/>
//     Address: ${userAddress}
//   </div>

//   <!-- ITEMS -->
//   <div class="box">
//     <h3>Order Items (Multi Vendor Supported)</h3>

//     <table>
//       <thead>
//         <tr>
//           <th>Product / Vendor</th>
//           <th>Price</th>
//           <th>Qty</th>
//           <th>Delivery</th>
//           <th>GST</th>
//           <th>Total</th>
//         </tr>
//       </thead>

//       <tbody>
//         ${itemsHtml || `<tr><td colspan="6">No items</td></tr>`}
//       </tbody>
//     </table>
//   </div>

//   <!-- TOTALS -->
//   <div class="totals">
//     <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
//     <p>Delivery: ₹${deliveryTotal.toFixed(2)}</p>
//     <p>GST: ₹${gstTotal.toFixed(2)}</p>

//     <div class="grand">
//       Grand Total: ₹${grandTotal.toFixed(2)}
//     </div>
//   </div>

//   <p style="text-align:center;font-size:10px;color:gray;margin-top:20px;">
//     This is a system generated invoice (ConstructionOne)
//   </p>

// </div>

// </body>
// </html>
// `;
// }

// function buildInvoiceHtml(order) {
//   const invoiceNo = `INV-${order._id.toString().slice(-6).toUpperCase()}`;
//   const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN");

//   // ----------------------------
//   // USER INFO
//   // ----------------------------
//   const user = order.userId || {};
//   const shipping = order.shippingAddressId || {};

//   const userName =
//     user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();

//   const userEmail = user.email || "N/A";
//   const userPhone = user.phone || "N/A";

//   const userAddress = [
//     shipping.addressLine,
//     shipping.city,
//     shipping.state,
//     shipping.pincode,
//     shipping.country,
//   ]
//     .filter(Boolean)
//     .join(", ");

//   // ----------------------------
//   // VENDOR SUMMARY (NEW ADDITION)
//   // ----------------------------
//   const vendorSummary =
//     [
//       ...new Map(
//         (order.items || [])
//           .map((i) => i.vendorId)
//           .filter(Boolean)
//           .map((v) => [
//             v._id,
//             `
//             <b>${v.firstName || ""} ${v.lastName || ""}</b><br/>
//             📧 ${v.email || "N/A"}<br/>
//             📞 ${v.phoneNumber || "N/A"}
//           `,
//           ]),
//       ).values(),
//     ].join("<hr/>") || "N/A";

//   // ----------------------------
//   // TOTALS
//   // ----------------------------
//   let subtotal = 0;
//   let deliveryTotal = 0;
//   let gstTotal = 0;

//   // ----------------------------
//   // ITEMS
//   // ----------------------------
//   const itemsHtml = (order.items || [])
//     .map((item, idx) => {
//       const product = item.productId || {};
//       const variant = item.variantId || {};
//       const vendor = item.vendorCompany || {};

//       const vendorProfile = item.vendorId || {};
//       const vendorCompany = item.vendorCompany || {};

//       const vendorName = `${vendorProfile.firstName || ""} ${vendorProfile.lastName || ""}`;
//       const vendorEmail = vendorProfile.email || "-";
//       const vendorPhone = vendorProfile.phoneNumber || "-";

//       const vendorAddress = [vendorCompany.businessAddress?.address]
//         .filter(Boolean)
//         .join(", ");

//       const price = Number(item.price || variant.price || 0);
//       const qty = Number(item.quantity || 1);

//       const deliveryFee = Number(item.deliveryFee || 0);
//       const deliveryType = item.deliveryType || "-";

//       const brand = product.brandId?.name || "-";

//       const category = product.categoryId?.name || "-";
//       const pcategory = product.pcategoryId?.name || "-";

//       const subcategories = (product.subcategoryId || [])
//         .map((s) => s.name)
//         .join(", ");

//       const productTypes = (product.productTypeId || [])
//         .map((p) => p.typeName)
//         .join(", ");

//       const image = product.images?.[0] || "";

//       const variantDetails = `
// Weight: ${variant.packageWeight || "-"}kg
//  | Size: ${variant.packageDimensions || "-"}
// `;

//       const base = price * qty;
//       const gstRate = Number(item.gstRate || 18);
//       const gst = (base * gstRate) / 100;

//       const total = base + gst + deliveryFee;

//       subtotal += base;
//       deliveryTotal += deliveryFee;
//       gstTotal += gst;

//       return `
//       <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">

//         <!-- PRODUCT + VENDOR -->
//         <td>
//           <b>${product.name || "Product"}</b>

//           <div style="font-size:11px;color:gray;margin-top:4px;">
//           <b>Vendor:</b> ${vendorCompany.companyName || "Vendor"}<br/>
//               ${vendorName}<br/>
//               📧 ${vendorEmail}<br/>
//               📞 ${vendorPhone}<br/>
//               📍 ${vendorAddress}
//             Delivery Type: <b>${deliveryType}</b>
//           </div>
//         </td>

//         <!-- PRICE -->
//         <td style="text-align:center;">
//           ₹${price.toFixed(2)}
//         </td>

//         <!-- QTY -->
//         <td style="text-align:center;">
//           ${qty}
//         </td>

//         <!-- DELIVERY -->
//         <td style="text-align:center;">
//           ₹${deliveryFee.toFixed(2)}
//         </td>

//         <!-- GST -->
//         <td style="text-align:center;">
//           ₹${gst.toFixed(2)}
//         </td>

//         <!-- TOTAL -->
//         <td style="text-align:right;font-weight:600;">
//           ₹${total.toFixed(2)}
//         </td>

//       </tr>
//       `;
//     })
//     .join("");

//   const grandTotal = subtotal + deliveryTotal + gstTotal;

//   // ----------------------------
//   // HTML
//   // ----------------------------
//   return `
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8"/>

// <style>
//   body { font-family: Arial; font-size: 12px; margin:0; padding:20px; color:#111; }

//   .wrap { max-width: 950px; margin:auto; }

//   .header {
//     display:flex;
//     justify-content:space-between;
//     border-bottom:2px solid #111;
//     padding-bottom:10px;
//   }

//   table {
//     width:100%;
//     border-collapse: collapse;
//     margin-top:15px;
//   }

//   th, td {
//     border:1px solid #ddd;
//     padding:8px;
//     font-size:11px;
//   }

//   th {
//     background:#111827;
//     color:white;
//   }

//   .box {
//     border:1px solid #ddd;
//     padding:10px;
//     margin-top:15px;
//     border-radius:6px;
//   }

//   .totals {
//     text-align:right;
//     margin-top:15px;
//     font-size:13px;
//   }

//   .grand {
//     font-size:18px;
//     font-weight:bold;
//     border-top:2px solid #000;
//     padding-top:10px;
//   }
// </style>

// </head>

// <body>

// <div class="wrap">

//   <!-- HEADER -->
//   <div class="header">
//     <div>
//       <h2>ConstructionOne Marketplace</h2>
//       <small>Order Invoice</small>
//     </div>

//     <div style="text-align:right">
//       <b>Invoice:</b> ${invoiceNo}<br/>
//       <b>Date:</b> ${invoiceDate}<br/>
//       <b>Status:</b> ${order.paymentStatus || "UNPAID"}<br/>
//       <b>Payment:</b> ${order.paymentMethod || "-"}
//     </div>
//   </div>

//   <!-- CUSTOMER -->
//   <div class="box">
//     <h3>Customer Details</h3>
//     <b>${userName}</b><br/>
//     Email: ${userEmail}<br/>
//     Phone: ${userPhone}<br/>
//     Address: ${userAddress}
//   </div>

//   <!-- VENDOR SUMMARY (NEW) -->
//   <div class="box">
//     <h3>Vendor(s) Involved</h3>
//     ${vendorSummary}
//   </div>

//   <!-- ITEMS -->
//   <div class="box">
//     <h3>Order Items (Multi Vendor Supported)</h3>

//     <table>
//       <thead>
//         <tr>
//           <th>Product / Vendor</th>
//           <th>Price</th>
//           <th>Qty</th>
//           <th>Delivery</th>
//           <th>GST</th>
//           <th>Total</th>
//         </tr>
//       </thead>

//       <tbody>
//         ${itemsHtml || `<tr><td colspan="6">No items</td></tr>`}
//       </tbody>
//     </table>
//   </div>

//   <!-- TOTALS -->
//   <div class="totals">
//     <p>Subtotal: ₹${subtotal.toFixed(2)}</p>
//     <p>Delivery: ₹${deliveryTotal.toFixed(2)}</p>
//     <p>GST: ₹${gstTotal.toFixed(2)}</p>

//     <div class="grand">
//       Grand Total: ₹${grandTotal.toFixed(2)}
//     </div>
//   </div>

//   <p style="text-align:center;font-size:10px;color:gray;margin-top:20px;">
//     This is a system generated invoice (ConstructionOne Marketplace)
//   </p>

// </div>

// </body>
// </html>
// `;
// }
// const invoice = async (order) => {
//   const code = `ConstructiononeOrder/${order._id.toString()}`;
//   const html = buildInvoiceHtml(order);
//   // generateAndSaveInvoice returns the full public URL
//   const pdfUrl = await generateAndSaveInvoice({ html, code });
//   return pdfUrl;
// };

// export default invoice;

export const prepareOrderForInvoice = async (orderId) => {
  const order = await orderModel
    .findById(orderId)
    .populate("userId")
    .populate("shippingAddressId")
    .populate({
      path: "items.productId",
      populate: [
        { path: "brandId", select: "name" },
        { path: "categoryId", select: "name" },
        { path: "pcategoryId", select: "name" },
        { path: "subcategoryId", select: "name" },
        { path: "productTypeId", select: "typeName" },
      ],
    })
    .populate("items.variantId")
    .populate({
      path: "items.vendorId",
      select: "firstName lastName email phoneNumber",
    })
    .lean();

  // ----------------------------
  // Attach Vendor Company
  // ----------------------------
  const vendorIds = [
    ...new Set(
      order.items.map((i) => i.vendorId?._id?.toString()).filter(Boolean),
    ),
  ];

  const companies = await VendorCompany.find({
    vendorId: { $in: vendorIds },
  })
    .select("companyName businessAddress vendorId")
    .lean();

  const companyMap = {};

  companies.forEach((c) => {
    companyMap[c.vendorId.toString()] = c;
  });

  order.items.forEach((item) => {
    const vId = item.vendorId?._id?.toString();
    item.vendorCompany = companyMap[vId] || null;
  });

  return order;
};
function buildInvoiceHtml(order) {
  const invoiceNo = `INV-${order._id.toString().slice(-6).toUpperCase()}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN");

  // ----------------------------
  // USER INFO
  // ----------------------------
  const user = order.userId || {};
  const shipping = order.shippingAddressId || {};

  const userName =
    user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const userEmail = user.email || "N/A";
  const userPhone = user.phone || "N/A";

  const userAddress = [
    shipping.addressLine,
    shipping.landMark,
    shipping.city,
    shipping.state,
    shipping.pincode,
    shipping.country,
  ]
    .filter(Boolean)
    .join(", ");

  // ----------------------------
  // TOTALS
  // ----------------------------
  let subtotal = 0;
  let deliveryTotal = 0;
  let gstTotal = 0;

  // ----------------------------
  // ITEMS
  // ----------------------------
  const itemsHtml = (order.items || [])
    .map((item, idx) => {
      const product = item.productId || {};
      const variant = item.variantId || {};
      const vendor = item.vendorId || {};
      const company = item.vendorCompany || {};

      // Vendor
      const vendorName = `${vendor.firstName || ""} ${vendor.lastName || ""}`;
      const vendorPhone = vendor.phoneNumber || "-";

      const vendorAddress = [
        company.businessAddress?.address,
        company.businessAddress?.city,
        company.businessAddress?.state,
        company.businessAddress?.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      // Product
      const brand = product.brandId?.name || "-";
      const category = product.categoryId?.name || "-";
      const pcategory = product.pcategoryId?.name || "-";

      const subcategories =
        (product.subcategoryId || []).map((s) => s.name).join(", ") || "-";

      const productTypes =
        (product.productTypeId || []).map((p) => p.typeName).join(", ") || "-";

      const variantDetails = `
        Weight: ${variant.packageWeight || "-"}kg |
        Size: ${variant.packageDimensions || "-"}
      `;

      // Pricing
      const price = Number(item.price || variant.price || 0);
      const qty = Number(item.quantity || 1);
      const deliveryFee = Number(item.deliveryFee || 0);
      const deliveryType = item.deliveryType || "-";

      const base = price * qty;
      const gstRate = Number(item.gstRate || 18);
      const gst = (base * gstRate) / 100;

      const total = base + gst + deliveryFee;

      subtotal += base;
      deliveryTotal += deliveryFee;
      gstTotal += gst;

      return `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9fafb"}">

        <td>
          <b>${product.name || "Product"}</b>

          <div style="font-size:11px;color:#555;margin-top:4px;">
            Brand: ${brand}<br/>
            Category: ${pcategory} → ${category}<br/>
            Subcategory: ${subcategories}<br/>
            Type: ${productTypes}<br/>
            Variant: ${variantDetails}
          </div>

          <div style="margin-top:6px;font-size:11px;border-top:1px dashed #ccc;padding-top:5px;">
            <b>${company.companyName || "SKYB Pvt Ltd"}</b><br/>
            ${vendorName}<br/>
            ${vendorPhone}<br/>
             ${vendorAddress || "-"}<br/>
            Delivery: <b>${deliveryType}</b>
          </div>
        </td>

        <td style="text-align:center;">₹${price.toFixed(2)}</td>
        <td style="text-align:center;">${qty}</td>
        <td style="text-align:center;">₹${deliveryFee.toFixed(2)}</td>
        <td style="text-align:center;">₹${gst.toFixed(2)}</td>
        <td style="text-align:right;font-weight:600;">₹${total.toFixed(2)}</td>

      </tr>
      `;
    })
    .join("");

  const grandTotal = subtotal + deliveryTotal + gstTotal;

  // ----------------------------
  // HTML
  // ----------------------------
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Arial; font-size: 12px; padding:20px; }
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
    background:#000;
    color:#fff;
  }

  .box {
    border:1px solid #ddd;
    padding:10px;
    margin-top:15px;
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

  <div class="header">
    <div>
      <h2>ConstructionOne Marketplace</h2>
      <small>Invoice</small>
    </div>

    <div style="text-align:right">
      <b>${invoiceNo}</b><br/>
      ${invoiceDate}<br/>
      ${order.paymentStatus}<br/>
      ${order.paymentMethod}
    </div>
  </div>

  <div class="box">
    <b>${userName}</b><br/>
    ${userEmail}<br/>
    ${userPhone}<br/>
    ${userAddress}
  </div>

  <table>
    <thead>
      <tr>
        <th>Product Details</th>
        <th>Price</th>
        <th>Qty</th>
        <th>Delivery</th>
        <th>GST</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || `<tr><td colspan="6">No items</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    Subtotal: ₹${subtotal.toFixed(2)}<br/>
    Delivery: ₹${deliveryTotal.toFixed(2)}<br/>
    GST: ₹${gstTotal.toFixed(2)}<br/>

    <div class="grand">
      Total: ₹${grandTotal.toFixed(2)}
    </div>
  </div>

</div>
</body>
</html>
`;
}

// ----------------------------
// GENERATE PDF
// ----------------------------
const invoice = async (order) => {
  const html = buildInvoiceHtml(order);
  const code = `ConstructiononeOrder/${order._id}`;
  return await generateAndSaveInvoice({ html, code });
};

export default invoice;
