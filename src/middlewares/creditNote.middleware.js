import { generateAndSaveInvoice } from "./pdfGenrator.js";

/**
 * Build Credit Note HTML for a cancelled order
 * @param {Object} order - Cancelled master order document
 */
function buildCreditNoteHtml(order) {
    const orderId = order._id?.toString() || "N/A";
    const cancelDate = new Date().toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
    });
    const originalDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
        year: "numeric", month: "long", day: "numeric",
    });

    const creditNoteNo = `CN-${orderId.slice(-8).toUpperCase()}`;

    const addr = order.shippingAddress || {};
    const customerName = addr.name || "Customer";
    const customerAddress = [
        addr.addressLine1 || addr.address,
        addr.city && addr.state ? `${addr.city}, ${addr.state}` : addr.city || addr.state,
        addr.pincode || addr.zip,
    ].filter(Boolean).join(", ");

    const refundable =
        order.paymentStatus === "PAID" &&
        ["WALLET", "ONLINE"].includes(order.paymentMethod);

    const grandTotal = Number(order.totalAmount || 0).toFixed(2);

    const itemsHtml = (order.items || [])
        .map((item, idx) => {
            const name = item.product?.name || item.product?.title ||
                (typeof item.product === "string" ? item.product : "Product");
            const price = Number(item.price || 0).toFixed(2);
            const qty = item.quantity || 1;
            const subtotal = (Number(item.price || 0) * qty).toFixed(2);
            return `
        <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#fef2f2"}">
          <td style="padding:11px 10px;font-size:13px;color:#111827;">${name}</td>
          <td style="padding:11px 10px;text-align:center;font-size:13px;color:#374151;">₹${price}</td>
          <td style="padding:11px 10px;text-align:center;font-size:13px;color:#374151;">${qty}</td>
          <td style="padding:11px 10px;text-align:right;font-size:13px;font-weight:600;color:#991b1b;">₹${subtotal}</td>
        </tr>`;
        }).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Credit Note ${creditNoteNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; color: #111827; }
    .wrapper { max-width: 780px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); padding: 28px 40px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: 1px; }
    .cn-tag { text-align: right; }
    .cn-tag h2 { font-size: 20px; color: #fff; font-weight: 700; }
    .cn-tag p { font-size: 12px; color: #fecaca; margin-top: 4px; }
    .notice { background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 28px; font-size: 13px; color: #991b1b; }
    .meta { display: flex; gap: 0; border-bottom: 1px solid #e5e7eb; }
    .meta-box { flex: 1; padding: 18px 24px; border-right: 1px solid #e5e7eb; }
    .meta-box:last-child { border-right: none; }
    .meta-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 5px; }
    .meta-box .value { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.6; }
    .table-wrap { padding: 0 24px 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    thead tr { background: #7f1d1d; }
    thead th { padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #fecaca; text-align: left; }
    thead th:nth-child(2), thead th:nth-child(3) { text-align: center; }
    thead th:last-child { text-align: right; }
    tbody tr td { border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .totals { padding: 16px 24px 24px; display: flex; justify-content: flex-end; }
    .totals-box { width: 260px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 13px; color: #374151; padding: 5px 0; }
    .totals-row.grand { font-size: 16px; font-weight: 700; color: #991b1b; border-top: 2px solid #dc2626; padding-top: 10px; margin-top: 4px; }
    .refund-badge { background: ${refundable ? "#dcfce7" : "#fef9c3"}; color: ${refundable ? "#166534" : "#854d0e"}; border: 1px solid ${refundable ? "#86efac" : "#fde047"}; border-radius: 8px; padding: 12px 24px; margin: 0 24px 20px; font-size: 13px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; }
    .footer strong { color: #6b7280; }
  </style>
</head>
<body>
<div class="wrapper">

  <!-- Header -->
  <div class="header">
    <div class="brand">Constructionone<span style="opacity:0.7;">.</span></div>
    <div class="cn-tag">
      <h2>CREDIT NOTE</h2>
      <p>${creditNoteNo}</p>
    </div>
  </div>

  <!-- Cancellation notice -->
  <div class="notice">
    ⚠️ This credit note is issued against the cancellation of Order <strong>#${orderId}</strong>.
    ${order.reason ? `Reason: <em>${order.reason}</em>` : ""}
  </div>

  <!-- Meta info -->
  <div class="meta">
    <div class="meta-box">
      <div class="label">Credit Note Date</div>
      <div class="value">${cancelDate}</div>
    </div>
    <div class="meta-box">
      <div class="label">Original Order Date</div>
      <div class="value">${originalDate}</div>
    </div>
    <div class="meta-box">
      <div class="label">Payment Method</div>
      <div class="value">${order.paymentMethod || "—"}</div>
    </div>
    <div class="meta-box">
      <div class="label">Original Amount</div>
      <div class="value">₹${grandTotal}</div>
    </div>
  </div>

  <!-- Customer info -->
  <div class="meta" style="border-bottom:1px solid #e5e7eb;">
    <div class="meta-box" style="flex:2;">
      <div class="label">Issued To</div>
      <div class="value"><strong>${customerName}</strong><br/>${customerAddress || "—"}</div>
    </div>
    <div class="meta-box" style="flex:1;">
      <div class="label">Order ID</div>
      <div class="value">${orderId}</div>
    </div>
  </div>

  <!-- Items -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Unit Price</th>
          <th>Qty</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;">No items</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- Total -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row grand">
        <span>Total Credit</span>
        <span>₹${grandTotal}</span>
      </div>
    </div>
  </div>

  <!-- Refund note -->
  <div class="refund-badge">
    ${refundable
            ? `✅ Refund of ₹${grandTotal} will be credited to your ${order.paymentMethod === "WALLET" ? "wallet" : "original payment source"} within 5–7 business days.`
            : `ℹ️ No refund applicable (Order was ${order.paymentStatus === "UNPAID" ? "unpaid" : "paid via COD"}).`
        }
  </div>

  <!-- Footer -->
  <div class="footer">
    <strong>Constructionone Marketplace</strong> &nbsp;|&nbsp; This is a computer-generated credit note. No signature required.
  </div>

</div>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────────────────── */

const creditNoteInvoice = async (order) => {
    const code = `ConstructiononeCredits/${order._id.toString()}`;
    const html = buildCreditNoteHtml(order);
    const pdfUrl = await generateAndSaveInvoice({ html, code });
    return pdfUrl;
};

export default creditNoteInvoice;
