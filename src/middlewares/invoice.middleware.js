import { generateAndSaveInvoice } from "./pdfGenrator.js";


function buildInvoiceHtml(order) {
  const orderId = order._id?.toString() || "N/A";
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const addr = order.shippingAddress || {};
  const addressHtml = [
    addr.name,
    addr.addressLine1 || addr.address,
    addr.addressLine2,
    addr.city && addr.state ? `${addr.city}, ${addr.state}` : addr.city || addr.state,
    addr.pincode || addr.zip,
    addr.phone || addr.mobile,
  ]
    .filter(Boolean)
    .join("<br/>");

  const payBadgeColor =
    order.paymentStatus === "PAID"
      ? "#22c55e"
      : order.paymentStatus === "FAILED"
        ? "#ef4444"
        : "#f59e0b";

  const itemsHtml = (order.items || [])
    .map((item, idx) => {
      const name =
        item.product?.name ||
        item.product?.title ||
        (typeof item.product === "string" ? item.product : "Product");
      const thumbnail = item.thumbnail || item.product?.thumbnail || "";
      const price = Number(item.price || 0).toFixed(2);
      const qty = item.quantity || 1;
      const subtotal = (Number(item.price || 0) * qty).toFixed(2);

      return `
        <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#f9fafb"}">
          <td style="padding:12px 10px; display:flex; align-items:center; gap:10px;">
            ${thumbnail
          ? `<img src="${thumbnail}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;"/>`
          : `<div style="width:40px;height:40px;background:#e5e7eb;border-radius:6px;"></div>`
        }
            <span style="font-size:13px;color:#111827;">${name}</span>
          </td>
          <td style="padding:12px 10px;text-align:center;font-size:13px;color:#374151;">₹${price}</td>
          <td style="padding:12px 10px;text-align:center;font-size:13px;color:#374151;">${qty}</td>
          <td style="padding:12px 10px;text-align:right;font-size:13px;font-weight:600;color:#111827;">₹${subtotal}</td>
        </tr>`;
    })
    .join("");

    
  const totalAmount = Number(order.totalAmount || 0).toFixed(2);
  const netAmount = Number(order.netAmount || order.totalAmount || 0).toFixed(2);
  const discount = (Number(order.totalAmount || 0) - Number(order.netAmount || order.totalAmount || 0)).toFixed(2);

 return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Invoice #${orderId}</title>

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, sans-serif;
    background: #f9fafb;
    color: #111827;
  }

  .wrapper {
    max-width: 800px;
    margin: 20px auto;
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }

  /* HEADER */
  .header {
    padding: 25px 30px;
    background: #2563eb;
    color: #fff;
    display: flex;
    justify-content: space-between;
  }

  .brand {
    font-size: 22px;
    font-weight: bold;
  }

  .meta {
    text-align: right;
    font-size: 12px;
  }

  /* SECTION */
  .section {
    padding: 20px 30px;
    border-bottom: 1px solid #e5e7eb;
  }

  .section h3 {
    font-size: 14px;
    margin-bottom: 8px;
    color: #2563eb;
  }

  .box p {
    margin: 3px 0;
    font-size: 12px;
  }

  /* TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 12px;
  }

  th, td {
    border: 1px solid #e5e7eb;
    padding: 8px;
  }

  th {
    background: #f3f4f6;
    font-weight: 600;
  }

  .right { text-align: right; }

  /* TOTAL */
  .totals {
    padding: 20px 30px;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
  }

  .grand {
    font-size: 15px;
    font-weight: bold;
    border-top: 2px solid #2563eb;
    padding-top: 8px;
  }

  /* FOOTER */
  .footer {
    padding: 15px 30px;
    font-size: 11px;
    text-align: center;
    background: #f9fafb;
    color: #6b7280;
  }

</style>
</head>

<body>
<div class="wrapper">

  <!-- HEADER -->
  <div class="header">
    <div class="brand">ConstructionOne</div>
    <div class="meta">
      <div><strong>Invoice No:</strong> ${orderId}</div>
      <div><strong>Date:</strong> ${invoiceDate}</div>
      <div><strong>Payment:</strong> ${order.paymentMethod || "—"}</div>
      <div><strong>Status:</strong> ${order.paymentStatus || "UNPAID"}</div>
    </div>
  </div>

  <!-- BILLING & SHIPPING -->
  <div class="section">
    <h3>Shipping Details</h3>
    <div class="box">
      ${addressHtml || "—"}
    </div>
  </div>

  <!-- ITEMS -->
  <div class="section">
    <h3>Order Items</h3>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="right">Unit Price</th>
          <th class="right">Qty</th>
          <th class="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="4" style="text-align:center;">No items found</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- TOTAL -->
  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>₹${totalAmount}</span>
    </div>

    ${Number(discount) > 0
      ? `<div class="totals-row">
           <span>Discount</span>
           <span>- ₹${discount}</span>
         </div>`
      : ""
    }

    <div class="totals-row grand">
      <span>Total Payable</span>
      <span>₹${netAmount}</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    Thank you for shopping with <strong>ConstructionOne</strong>.<br/>
    This is a system generated invoice.
  </div>

</div>
</body>
</html>`;
}



const invoice = async (order) => {
  const code = `ConstructiononeOrder/${order._id.toString()}`;

  const html = buildInvoiceHtml(order);

  // generateAndSaveInvoice returns the full public URL
  const pdfUrl = await generateAndSaveInvoice({ html, code });

  return pdfUrl;
};

export default invoice;
