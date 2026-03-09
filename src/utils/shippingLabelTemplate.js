import userModel from "../models/user/user.model.js";
import { VendorCompany } from "../models/vendorShop/vendor.model.js";
import Product from "../models/vendorShop/product.model.js";

const s = (val) => {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'object') return val.toString ? val.toString() : JSON.stringify(val);
  return String(val);
};

export const generateShippingLabelHTML = async (data) => {

    const userId = data.order.userId;
    const vendorId = data.order.vendorId;

    const [user, vendor, itemsWithProducts] = await Promise.all([
        userModel.findById(userId),
        VendorCompany.findById(vendorId),
        Promise.all(data.order.items.map(async (item) => {
            const product = await Product.findById(item.product);
            return {
                ...item,
                productName: product.name||'N/A',
                sku: product.sku ||'N/A',
                price: item.price || 0,
                quantity: item.quantity || 1,
            };
        }))
    ]);

    const vendorAddress = vendor?.businessAddress;
    const shippingAddr = data.order.shippingAddress;
    const shipTo = typeof shippingAddr === 'object'
        ? `${shippingAddr.address ?? ''}, ${shippingAddr.city ?? ''}, ${shippingAddr.state ?? ''}, ${shippingAddr.pincode ?? ''}, ${shippingAddr.country ?? ''}`
        : shippingAddr ?? 'N/A';

    const orderDate = new Date(data.order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, sans-serif;
    font-size: 11px;
    background: #fff;
    color: #000;
  }

  .label {
    width: 595px;
    border: 1.5px solid #000;
    margin: 0 auto;
  }

  /* ── Row 1: Ship To + Logo ── */
  .row-shipto {
    display: flex;
    border-bottom: 1.5px solid #000;
    min-height: 110px;
  }
  .ship-to-block {
    flex: 1;
    padding: 8px 10px;
    border-right: 1.5px solid #000;
  }
  .ship-to-block .label-title {
    font-weight: bold;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .ship-to-block .name {
    font-weight: bold;
    font-size: 12px;
  }
  .ship-to-block .address {
    font-size: 11px;
    line-height: 1.5;
    margin-top: 3px;
  }
  .logo-block {
    width: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  .logo-block img {
    max-width: 120px;
    max-height: 90px;
    object-fit: contain;
  }

  /* ── Row 2: Info Left + Barcode Right ── */
  .row-info-barcode {
    display: flex;
    border-bottom: 1.5px solid #000;
    min-height: 110px;
  }
  .info-block {
    flex: 1;
    padding: 8px 10px;
    border-right: 1.5px solid #000;
    font-size: 11px;
    line-height: 1.8;
  }
  .barcode-block {
    width: 200px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding: 8px 10px;
    gap: 6px;
  }
  .barcode-block .courier-name {
    font-weight: bold;
    font-size: 12px;
    text-align: right;
  }
  .barcode-block .awb-label {
    font-size: 11px;
    text-align: right;
  }
  .barcode-block img {
    max-width: 180px;
    height: 55px;
    object-fit: fill;
  }

  /* ── Row 3: Shipped By + Order Barcode ── */
  .row-shipped {
    display: flex;
    border-bottom: 1.5px solid #000;
    min-height: 110px;
  }
  .shipped-by-block {
    flex: 1;
    padding: 8px 10px;
    border-right: 1.5px solid #000;
    font-size: 11px;
    line-height: 1.6;
  }
  .shipped-by-block .sb-title {
    font-weight: bold;
    font-size: 11px;
  }
  .shipped-by-block .sb-italic {
    font-style: italic;
    font-weight: normal;
    font-size: 10px;
  }
  .order-barcode-block {
    width: 200px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding: 8px 10px;
    gap: 4px;
    font-size: 11px;
    text-align: right;
    line-height: 1.6;
  }
  .order-barcode-block img {
    max-width: 180px;
    height: 50px;
    object-fit: fill;
  }

  /* ── Row 4: Items Table ── */
  .row-table {
    border-bottom: 1.5px solid #000;
    padding: 0;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .items-table th {
    border: 1px solid #000;
    padding: 5px 6px;
    font-weight: bold;
    text-align: left;
    background: #fff;
  }
  .items-table td {
    border: 1px solid #000;
    padding: 5px 6px;
    vertical-align: top;
  }

  /* ── Row 5: Fees ── */
  .row-fees {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1.5px solid #000;
    font-size: 11px;
    line-height: 1.8;
  }
  .fees-left { flex: 1; }
  .fees-right { text-align: right; }

  /* ── Row 6: Footer ── */
  .row-footer {
    border-bottom: 1.5px solid #000;
    padding: 6px 10px;
    font-size: 10px;
    font-weight: bold;
  }

  /* ── Row 7: Powered By ── */
  .row-poweredby {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    font-size: 10px;
  }
</style>
</head>
<body>

<div class="label">

  <!-- ROW 1: Ship To + Logo -->
  <div class="row-shipto">
    <div class="ship-to-block">
      <div class="label-title">Ship To</div>
      <div class="name">${s(user?.firstName)} ${s(user?.lastName)}</div>
      <div class="address">
        ${s(shipTo)}<br/>
        ${s(user?.phone)}
      </div>
    </div>
    <div class="logo-block">
      <!-- Replace src with your actual logo URL -->
      <img src="${s(data.logoUrl)}" alt="Logo" onerror="this.style.display='none'"/>
    </div>
  </div>

  <!-- ROW 2: Info + AWB Barcode -->
  <div class="row-info-barcode">
    <div class="info-block">
      <b>Dimensions:</b> ${s(data.order.dimensions)}<br/>
      <b>Payment:</b> ${s(data.order.paymentStatus)}<br/>
      <b>Order Total:</b> ₹${s(data.order.totalAmount)}<br/>
      <b>Weight:</b> ${s(data.order.weight)} kg<br/>
      <b>EWaybill No:</b> ${s(data.ewaybill)}<br/>
      <b>Routing code:</b> ${s(data.routing)}<br/>
      <b>RTO Routing code:</b> ${s(data.rtoRouting)}
    </div>
    <div class="barcode-block">
      <div class="courier-name">Delhivery Surface</div>
      <div class="awb-label"><b>AWB:</b> ${s(data.order.trackingNumber)}</div>
      <img src="${s(data.barcode)}" alt="AWB Barcode"/>
    </div>
  </div>

  <!-- ROW 3: Shipped By + Order Barcode -->
  <div class="row-shipped">
    <div class="shipped-by-block">
      <div class="sb-title">Shipped By <span class="sb-italic">(if undelivered, return to)</span></div>
      <div style="margin-top:4px;">
        <b>${s(vendor?.companyName)}</b><br/>
        ${s(vendorAddress?.address)}<br/>
        ${s(vendorAddress?.city)}, ${s(vendorAddress?.state)}<br/>
        ${s(vendorAddress?.pincode)}
      </div>
    </div>
    <div class="order-barcode-block">
      <div><b>Order#:</b> ${s(data.order.parentId)}</div>
      <img src="${s(data.orderBarcode ?? data.barcode)}" alt="Order Barcode"/>
      <div>Invoice No. ${s(data.invoiceNumber)}</div>
      <div>Invoice Date: ${s(data.invoiceDate ?? orderDate)}</div>
      <div>Order Date: ${s(orderDate)}</div>
    </div>
  </div>

  <!-- ROW 4: Items Table -->
  <div class="row-table">
    <table class="items-table">
      <tr>
        <th style="width:45%">Item</th>
        <th style="width:20%">SKU</th>
        <th style="width:7%">Qty</th>
        <th style="width:12%">Price</th>
        <th style="width:16%">Total</th>
      </tr>
     ${itemsWithProducts.map((item) => `
    <tr>
      <td>${s(item.productName)}</td>
      <td>${s(item.sku)}</td>
      <td>${s(item.quantity)}</td>
      <td>&#8377;${s(item.price)}</td>
      <td>&#8377;${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)).toFixed(2)}</td>
    </tr>
  `).join('')}
    </table>
  </div>

  <!-- ROW 5: Fees -->
  <div class="row-fees">
    <div class="fees-left">
      Platform Fee: ₹${s(data.platformFee)}<br/>
      Shipping Charges: ₹${s(data.shippingCharges)}
    </div>
    <div class="fees-right">
      Discount: ₹${s(data.discount)}<br/>
      <b>Collectable Amount: ₹${s(data.order.totalAmount)}</b>
    </div>
  </div>

  <!-- ROW 6: Disclaimer -->
  <div class="row-footer">
    All disputes are subject to the jurisdiction of Bhopal only. Goods once sold will only be
    taken back or exchanged as per Bharat Agrolink's Return and Refund policies.
  </div>

  <!-- ROW 7: Auto generated + Powered By -->
  <div class="row-poweredby">
    <div>This is an auto generated label and does not require any signature.</div>
    <div>Powered By: <b>Shiprocket</b></div>
  </div>

</div>

</body>
</html>`;
};