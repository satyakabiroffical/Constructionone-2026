import Order from "../../models/marketPlace/order.model.js";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Parser as Json2csvParser } from "json2csv";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../../middlewares/uploads.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import User from "../../models/user/user.model.js";
import { catchAsync } from "../../middlewares/errorHandler.js";
import { VendorProfile } from "../../models/vendorShop/vendor.model.js";
import os from "os";
// ======================================================
// S3 CONFIG
// ======================================================

const bucket = process.env.LINODE_OBJECT_BUCKET;

const folderPath = process.env.BUCKET_FOLDER_PATH || "";

// ======================================================
// UPLOAD FILE TO S3
// ======================================================

const uploadFileToS3 = async ({ fileBuffer, fileName, contentType }) => {
  const key = `${folderPath}exports/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ACL: "public-read",
      ContentType: contentType,
    }),
  );

  return `${process.env.LINODE_OBJECT_STORAGE_ENDPOINT}/${bucket}/${key}`;
};

// ======================================================
// EXPORT ORDERS
// ======================================================

export const exportOrders = async (req, res, next) => {
  try {
    const { fileType = "csv" } = req.query;

    // ======================================================
    // FILTERS
    // ======================================================

    const filter = {};

    if (req.query.orderType) {
      filter.orderType = req.query.orderType;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    // ======================================================
    // DATE FILTERS
    // ======================================================

    const now = new Date();

    const dateRangeMap = {
      today: () => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        return {
          $gte: start,
        };
      },

      last7days: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);

        return {
          $gte: start,
        };
      },

      last30days: () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);

        return {
          $gte: start,
        };
      },

      custom: () => {
        const range = {};

        if (req.query.startDate) {
          range.$gte = new Date(req.query.startDate);
        }

        if (req.query.endDate) {
          const end = new Date(req.query.endDate);

          end.setHours(23, 59, 59, 999);

          range.$lte = end;
        }

        return Object.keys(range).length ? range : null;
      },
    };

    const { dateRange } = req.query;

    if (dateRange && dateRangeMap[dateRange]) {
      const range = dateRangeMap[dateRange]();

      if (range) {
        filter.createdAt = range;
      }
    }

    // ======================================================
    // FETCH ORDERS
    // ======================================================

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .populate({
        path: "items.productId",
        select: "name",
      })
      .populate({
        path: "items.variantId",
        select: "name Type sku",
      })
      .populate({
        path: "items.vendorId",
        select: "firstName lastName email phoneNumber",
      })
      .populate({
        path: "shippingAddressId",
      })
      .lean();

    // ======================================================
    // FORMAT DATA
    // ======================================================

    const formattedOrders = [];

    orders.forEach((order) => {
      order.items.forEach((item) => {
        formattedOrders.push({
          orderId: order._id?.toString(),

          orderDate: new Date(order.createdAt).toLocaleString(),

          orderStatus: order.status,

          paymentStatus: order.paymentStatus,

          paymentMethod: order.paymentMethod,

          customerName: order.userId?.name || "N/A",

          customerEmail: order.userId?.email || "N/A",

          customerPhone: order.userId?.phone || "N/A",

          productName: item.productId?.name || "N/A",

          orderType: item.variantId?.Type || "N/A",

          quantity: item.quantity,

          price: item.price,

          finalPrice: item.finalPrice,

          vendorAmount: item.vendorAmount,

          gstAmount: item.gstAmount,

          deliveryFee: item.deliveryFee,

          itemStatus: item.status,

          deliveryType: item.deliveryType,

          vendorName:
            `${item.vendorId?.firstName || ""} ${item.vendorId?.lastName || ""}`.trim() ||
            "Name not found",

          vendorEmail: item.vendorId?.email || "N/A",

          vendorPhone: item.vendorId?.phoneNumber || "+91-0000000000",

          //   subTotal: order.subTotal,

          //   totalDeliveryFee: order.totalDeliveryFee,

          //   handlingCharge: order.handlingCharge,
          //   netAmount: order.netAmount,

          address: [
            order.shippingAddressId?.addressLine,
            order.shippingAddressId?.city,
            order.shippingAddressId?.state,
            order.shippingAddressId?.pincode,
          ]
            .filter(Boolean)
            .join(", "),
        });
      });
    });

    // ======================================================
    // CSV EXPORT
    // ======================================================

    if (fileType === "csv") {
      const fields = [
        "orderId",
        "orderDate",
        "orderStatus",
        "paymentStatus",
        "paymentMethod",
        "customerName",
        "customerEmail",
        "customerPhone",
        "productName",
        "orderType",
        "quantity",
        "price",
        "finalPrice",
        "vendorAmount",
        "gstAmount",
        "deliveryFee",
        "itemStatus",
        "deliveryType",
        "vendorName",
        "vendorEmail",
        "vendorPhone",
        // "subTotal",
        // "totalDeliveryFee",
        // "handlingCharge",
        // "netAmount",
        "address",
      ];

      const parser = new Parser({ fields });

      const csv = parser.parse(formattedOrders);

      const fileName = `orders-${Date.now()}.csv`;

      const fileUrl = await uploadFileToS3({
        fileBuffer: Buffer.from(csv),
        fileName,
        contentType: "text/csv",
      });

      return res.status(200).json({
        success: true,
        message: "CSV exported successfully",
        fileType: "csv",
        totalRecords: formattedOrders.length,
        downloadUrl: fileUrl,
      });
    }

    // ======================================================
    // EXCEL EXPORT
    // ======================================================

    if (fileType === "excel") {
      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet("Orders");

      worksheet.columns = [
        { header: "Order ID", key: "orderId", width: 30 },

        { header: "Order Date", key: "orderDate", width: 22 },

        { header: "Order Status", key: "orderStatus", width: 18 },

        { header: "Payment Status", key: "paymentStatus", width: 18 },

        { header: "Payment Method", key: "paymentMethod", width: 18 },

        { header: "Customer Name", key: "customerName", width: 25 },

        { header: "Customer Email", key: "customerEmail", width: 30 },

        { header: "Customer Phone", key: "customerPhone", width: 18 },

        { header: "Product", key: "productName", width: 30 },

        { header: "OrderType", key: "orderType", width: 20 },

        { header: "Qty", key: "quantity", width: 10 },

        {
          header: "Price",
          key: "price",
          width: 15,
          style: {
            numFmt: "₹#,##0.00",
          },
        },

        {
          header: "Final Price",
          key: "finalPrice",
          width: 15,
          style: {
            numFmt: "₹#,##0.00",
          },
        },

        {
          header: "Vendor Amount",
          key: "vendorAmount",
          width: 18,
          style: {
            numFmt: "₹#,##0.00",
          },
        },

        {
          header: "GST",
          key: "gstAmount",
          width: 12,
          style: {
            numFmt: "₹#,##0.00",
          },
        },

        {
          header: "Delivery Fee",
          key: "deliveryFee",
          width: 15,
          style: {
            numFmt: "₹#,##0.00",
          },
        },

        { header: "Item Status", key: "itemStatus", width: 18 },

        { header: "Delivery Type", key: "deliveryType", width: 18 },

        { header: "Vendor Name", key: "vendorName", width: 25 },

        { header: "Vendor Email", key: "vendorEmail", width: 30 },

        { header: "Vendor Phone", key: "vendorPhone", width: 18 },

        // {
        //   header: "Sub Total",
        //   key: "subTotal",
        //   width: 15,
        //   style: {
        //     numFmt: "₹#,##0.00",
        //   },
        // },

        // {
        //   header: "Total Delivery",
        //   key: "totalDeliveryFee",
        //   width: 18,
        //   style: {
        //     numFmt: "₹#,##0.00",
        //   },
        // },

        // {
        //   header: "Handling",
        //   key: "handlingCharge",
        //   width: 15,
        //   style: {
        //     numFmt: "₹#,##0.00",
        //   },
        // },

        // {
        //   header: "Net Amount",
        //   key: "netAmount",
        //   width: 15,
        //   style: {
        //     numFmt: "₹#,##0.00",
        //   },
        // },

        { header: "Address", key: "address", width: 45 },
      ];

      worksheet.addRows(formattedOrders);

      worksheet.getRow(1).font = {
        bold: true,
        color: {
          argb: "FFFFFF",
        },
      };

      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "000000",
        },
      };

      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      worksheet.eachRow((row) => {
        row.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const fileName = `orders-${Date.now()}.xlsx`;

      const fileUrl = await uploadFileToS3({
        fileBuffer: buffer,
        fileName,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      return res.status(200).json({
        success: true,
        message: "Excel exported successfully",
        fileType: "excel",
        totalRecords: formattedOrders.length,
        downloadUrl: fileUrl,
      });
    }

    if (fileType === "pdf") {
      const doc = new PDFDocument({
        margin: 20,
        size: "A4",
        layout: "landscape",
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);

          const fileName = `orders-${Date.now()}.pdf`;

          const fileUrl = await uploadFileToS3({
            fileBuffer: pdfBuffer,
            fileName,
            contentType: "application/pdf",
          });

          return res.status(200).json({
            success: true,
            message: "PDF exported successfully",
            fileType: "pdf",
            totalRecords: formattedOrders.length,
            downloadUrl: fileUrl,
          });
        } catch (error) {
          next(error);
        }
      });

      // ======================================================
      // TITLE
      // ======================================================

      doc.fontSize(20).font("Helvetica-Bold").text("Orders Report", {
        align: "center",
      });

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated At: ${new Date().toLocaleString()}`, {
          align: "right",
        });

      doc.moveDown(1);

      // ======================================================
      // TABLE CONFIG
      // ======================================================

      const tableTop = doc.y;

      const rowHeight = 25;

      const colWidths = {
        no: 35,
        orderId: 120,
        customer: 100,
        product: 120,
        qty: 40,
        price: 70,
        status: 80,
        payment: 80,
        vendor: 100,
        amount: 80,
      };

      const startX = 20;

      // ======================================================
      // DRAW ROW
      // ======================================================

      const drawRow = (y, row, isHeader = false) => {
        let x = startX;

        const columns = [
          { text: row.no, width: colWidths.no },

          { text: row.orderId, width: colWidths.orderId },

          { text: row.customer, width: colWidths.customer },

          { text: row.product, width: colWidths.product },

          { text: row.qty, width: colWidths.qty },

          { text: row.price, width: colWidths.price },

          { text: row.status, width: colWidths.status },

          { text: row.payment, width: colWidths.payment },

          { text: row.vendor, width: colWidths.vendor },

          { text: row.amount, width: colWidths.amount },
        ];

        columns.forEach((col) => {
          // Background
          if (isHeader) {
            doc
              .rect(x, y, col.width, rowHeight)
              .fillAndStroke("#000000", "#000000");

            doc
              .fillColor("white")
              .font("Helvetica-Bold")
              .fontSize(9)
              .text(col.text, x + 4, y + 8, {
                width: col.width - 8,
                align: "center",
              });
          } else {
            doc.rect(x, y, col.width, rowHeight).stroke("#cccccc");

            doc
              .fillColor("black")
              .font("Helvetica")
              .fontSize(8)
              .text(String(col.text || ""), x + 4, y + 8, {
                width: col.width - 8,
                align: "center",
                ellipsis: true,
              });
          }

          x += col.width;
        });
      };

      // ======================================================
      // HEADER
      // ======================================================

      drawRow(
        tableTop,
        {
          no: "#",
          orderId: "ORDER ID",
          customer: "CUSTOMER",
          product: "PRODUCT",
          qty: "QTY",
          price: "PRICE",
          status: "STATUS",
          payment: "PAYMENT",
          vendor: "VENDOR",
          amount: "NET",
        },
        true,
      );

      // ======================================================
      // TABLE ROWS
      // ======================================================

      let currentY = tableTop + rowHeight;

      formattedOrders.forEach((order, index) => {
        // Auto New Page
        if (currentY > 520) {
          doc.addPage({
            margin: 20,
            size: "A4",
            layout: "landscape",
          });

          currentY = 40;

          drawRow(
            currentY,
            {
              no: "#",
              orderId: "ORDER ID",
              customer: "CUSTOMER",
              product: "PRODUCT",
              qty: "QTY",
              price: "PRICE",
              status: "STATUS",
              payment: "PAYMENT",
              vendor: "VENDOR",
              amount: "NET",
            },
            true,
          );

          currentY += rowHeight;
        }

        drawRow(currentY, {
          no: index + 1,

          orderId: order.orderId,

          customer: order.customerName,

          product: order.productName,

          qty: order.quantity,

          price: `₹${order.finalPrice}`,

          status: order.orderStatus,

          payment: order.paymentStatus,

          vendor: order.vendorName,

          //   amount: `₹${order.netAmount}`,
        });

        currentY += rowHeight;
      });

      // ======================================================
      // FOOTER
      // ======================================================

      doc.moveDown(2);

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`Total Records: ${formattedOrders.length}`, {
          align: "right",
        });

      doc.end();

      return;
    }

    // ======================================================
    // INVALID FILE TYPE
    // ======================================================

    return res.status(400).json({
      success: false,
      message: "Invalid file type. Use csv, excel, or pdf",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// EXPORT USERS
// ======================================================

export const exportUsers = catchAsync(async (req, res, next) => {
  try {
    const { fileType = "csv" } = req.query;

    // ======================================================
    // FILTER
    // ======================================================

    const filter = {
      role: req.query.role || "USER",
    };

    // ======================================================
    // GET USERS
    // ======================================================

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "firstName lastName phone email gender role permissions createdAt",
      )
      .lean();

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    // ======================================================
    // FORMAT DATA
    // ======================================================

    const formattedUsers = users.map((user, index) => ({
      SrNo: index + 1,

      ID: user._id.toString(),

      Name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),

      Phone: user.phone || "-",

      Email: user.email || "-",

      Gender: user.gender || "-",

      Role: user.role || "-",

      Permissions:
        user.permissions?.length > 0 ? user.permissions.join(", ") : "-",

      CreatedAt: new Date(user.createdAt).toLocaleString(),
    }));

    // ======================================================
    // CSV EXPORT
    // ======================================================

    if (fileType === "csv") {
      const fields = Object.keys(formattedUsers[0]);

      const parser = new Json2csvParser({ fields });

      const csv = parser.parse(formattedUsers);

      const fileName = `users-${Date.now()}.csv`;

      const fileUrl = await uploadFileToS3({
        fileBuffer: Buffer.from(csv),
        fileName,
        contentType: "text/csv",
      });

      return res.status(200).json({
        success: true,
        message: "CSV exported successfully",
        fileType: "csv",
        totalRecords: formattedUsers.length,
        downloadUrl: fileUrl,
      });
    }

    // ======================================================
    // EXCEL EXPORT
    // ======================================================

    if (fileType === "excel") {
      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet("Users");

      worksheet.columns = [
        { header: "SR NO", key: "SrNo", width: 10 },

        { header: "USER ID", key: "ID", width: 32 },

        { header: "NAME", key: "Name", width: 28 },

        { header: "PHONE", key: "Phone", width: 18 },

        { header: "EMAIL", key: "Email", width: 35 },

        { header: "GENDER", key: "Gender", width: 15 },

        { header: "ROLE", key: "Role", width: 15 },

        { header: "PERMISSIONS", key: "Permissions", width: 40 },

        { header: "CREATED AT", key: "CreatedAt", width: 25 },
      ];

      worksheet.addRows(formattedUsers);

      // HEADER STYLE

      worksheet.getRow(1).font = {
        bold: true,
        color: {
          argb: "FFFFFF",
        },
        size: 12,
      };

      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "000000",
        },
      };

      worksheet.getRow(1).height = 28;

      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      worksheet.eachRow((row, rowNumber) => {
        row.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };

        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          if (rowNumber % 2 === 0 && rowNumber !== 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "F3F4F6",
              },
            };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const fileName = `users-${Date.now()}.xlsx`;

      const fileUrl = await uploadFileToS3({
        fileBuffer: buffer,
        fileName,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      return res.status(200).json({
        success: true,
        message: "Excel exported successfully",
        fileType: "excel",
        totalRecords: formattedUsers.length,
        downloadUrl: fileUrl,
      });
    }

    // ======================================================
    // PDF EXPORT
    // ======================================================

    if (fileType === "pdf") {
      const doc = new PDFDocument({
        margin: 20,
        size: "A4",
        layout: "landscape",
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);

        const fileName = `users-${Date.now()}.pdf`;

        const fileUrl = await uploadFileToS3({
          fileBuffer: pdfBuffer,
          fileName,
          contentType: "application/pdf",
        });

        return res.status(200).json({
          success: true,
          message: "PDF exported successfully",
          fileType: "pdf",
          totalRecords: formattedUsers.length,
          downloadUrl: fileUrl,
        });
      });

      // TITLE

      doc.fontSize(20).font("Helvetica-Bold").text("Users Report", {
        align: "center",
      });

      doc.moveDown(1);

      // TABLE

      const tableTop = doc.y;

      const rowHeight = 25;

      const startX = 20;

      const colWidths = {
        no: 35,
        name: 120,
        phone: 100,
        email: 180,
        gender: 70,
        role: 70,
        created: 120,
      };

      const drawRow = (y, row, isHeader = false) => {
        let x = startX;

        const columns = [
          { text: row.no, width: colWidths.no },

          { text: row.name, width: colWidths.name },

          { text: row.phone, width: colWidths.phone },

          { text: row.email, width: colWidths.email },

          { text: row.gender, width: colWidths.gender },

          { text: row.role, width: colWidths.role },

          { text: row.created, width: colWidths.created },
        ];

        columns.forEach((col) => {
          if (isHeader) {
            doc
              .rect(x, y, col.width, rowHeight)
              .fillAndStroke("#000000", "#000000");

            doc
              .fillColor("white")
              .font("Helvetica-Bold")
              .fontSize(9)
              .text(col.text, x + 4, y + 8, {
                width: col.width - 8,
                align: "center",
              });
          } else {
            doc.rect(x, y, col.width, rowHeight).stroke("#cccccc");

            doc
              .fillColor("black")
              .font("Helvetica")
              .fontSize(8)
              .text(String(col.text || ""), x + 4, y + 8, {
                width: col.width - 8,
                align: "center",
                ellipsis: true,
              });
          }

          x += col.width;
        });
      };

      // HEADER

      drawRow(
        tableTop,
        {
          no: "#",
          name: "NAME",
          phone: "PHONE",
          email: "EMAIL",
          gender: "GENDER",
          role: "ROLE",
          created: "CREATED",
        },
        true,
      );

      // ROWS

      let currentY = tableTop + rowHeight;

      formattedUsers.forEach((user, index) => {
        if (currentY > 520) {
          doc.addPage({
            margin: 20,
            size: "A4",
            layout: "landscape",
          });

          currentY = 40;

          drawRow(
            currentY,
            {
              no: "#",
              name: "NAME",
              phone: "PHONE",
              email: "EMAIL",
              gender: "GENDER",
              role: "ROLE",
              created: "CREATED",
            },
            true,
          );

          currentY += rowHeight;
        }

        drawRow(currentY, {
          no: index + 1,

          name: user.Name,

          phone: user.Phone,

          email: user.Email,

          gender: user.Gender,

          role: user.Role,

          created: user.CreatedAt,
        });

        currentY += rowHeight;
      });

      doc.end();

      return;
    }

    return res.status(400).json({
      success: false,
      message: "Invalid file type",
    });
  } catch (error) {
    next(error);
  }
});

// ======================================================
// EXPORT VENDORS
// ======================================================

export const exportVendors = catchAsync(async (req, res, next) => {
  try {
    const { fileType = "csv" } = req.query;

    // ======================================================
    // GET VENDORS
    // ======================================================

    const vendors = await VendorProfile.aggregate([
      {
        $lookup: {
          from: "vendorcompanies",
          localField: "_id",
          foreignField: "vendorId",
          as: "company",
        },
      },

      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $project: {
          _id: 1,

          vendorName: {
            $concat: [
              { $ifNull: ["$firstName", ""] },
              " ",
              { $ifNull: ["$lastName", ""] },
            ],
          },

          email: 1,

          phoneNumber: 1,

          companyName: "$company.companyName",

          companyRegistrationNumber: "$company.companyRegistrationNumber",

          gstNumber: "$company.gstNumber",

          fullBusinessAddress: {
            $concat: [
              { $ifNull: ["$company.businessAddress.address", ""] },
              ", ",
              { $ifNull: ["$company.businessAddress.city", ""] },
              ", ",
              { $ifNull: ["$company.businessAddress.state", ""] },
              ", ",
              { $ifNull: ["$company.businessAddress.country", ""] },
              " - ",
              { $ifNull: ["$company.businessAddress.pincode", ""] },
            ],
          },

          createdAt: 1,
        },
      },
    ]);

    if (!vendors.length) {
      return res.status(404).json({
        success: false,
        message: "No vendors found",
      });
    }

    // ======================================================
    // FORMAT DATA
    // ======================================================

    const formattedVendors = vendors.map((vendor, index) => ({
      SrNo: index + 1,

      VendorID: vendor._id.toString(),

      VendorName: vendor.vendorName || "-",

      Email: vendor.email || "-",

      Phone: vendor.phoneNumber || "-",

      ShopName: vendor.companyName || "-",

      BusinessAddress: vendor.fullBusinessAddress || "-",

      CompanyRegistrationNumber: vendor.companyRegistrationNumber || "-",

      GSTNumber: vendor.gstNumber || "-",

      CreatedAt: new Date(vendor.createdAt).toLocaleString(),
    }));

    // ======================================================
    // CSV EXPORT
    // ======================================================

    if (fileType === "csv") {
      const fields = Object.keys(formattedVendors[0]);

      const parser = new Json2csvParser({ fields });

      const csv = parser.parse(formattedVendors);

      const fileName = `vendors-${Date.now()}.csv`;

      const fileUrl = await uploadFileToS3({
        fileBuffer: Buffer.from(csv),
        fileName,
        contentType: "text/csv",
      });

      return res.status(200).json({
        success: true,
        message: "CSV exported successfully",
        fileType: "csv",
        totalRecords: formattedVendors.length,
        downloadUrl: fileUrl,
      });
    }

    // ======================================================
    // EXCEL EXPORT
    // ======================================================

    if (fileType === "excel") {
      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet("Vendors");

      worksheet.columns = [
        { header: "SR NO", key: "SrNo", width: 10 },

        { header: "VENDOR ID", key: "VendorID", width: 32 },

        { header: "VENDOR NAME", key: "VendorName", width: 28 },

        { header: "EMAIL", key: "Email", width: 35 },

        { header: "PHONE", key: "Phone", width: 18 },

        { header: "SHOP NAME", key: "ShopName", width: 28 },

        { header: "BUSINESS ADDRESS", key: "BusinessAddress", width: 50 },

        {
          header: "COMPANY REGISTRATION NO",
          key: "CompanyRegistrationNumber",
          width: 35,
        },

        { header: "GST NUMBER", key: "GSTNumber", width: 25 },

        { header: "CREATED AT", key: "CreatedAt", width: 25 },
      ];

      worksheet.addRows(formattedVendors);

      // ======================================================
      // HEADER STYLE
      // ======================================================

      worksheet.getRow(1).font = {
        bold: true,
        color: {
          argb: "FFFFFF",
        },
        size: 12,
      };

      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "000000",
        },
      };

      worksheet.getRow(1).height = 28;

      worksheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      worksheet.eachRow((row, rowNumber) => {
        row.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };

        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Alternate Row Color
          if (rowNumber % 2 === 0 && rowNumber !== 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "F3F4F6",
              },
            };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const fileName = `vendors-${Date.now()}.xlsx`;

      const fileUrl = await uploadFileToS3({
        fileBuffer: buffer,
        fileName,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      return res.status(200).json({
        success: true,
        message: "Excel exported successfully",
        fileType: "excel",
        totalRecords: formattedVendors.length,
        downloadUrl: fileUrl,
      });
    }

    // ======================================================
    // PDF EXPORT
    // ======================================================

    if (fileType === "pdf") {
      const doc = new PDFDocument({
        margin: 20,
        size: "A4",
        layout: "landscape",
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);

        const fileName = `vendors-${Date.now()}.pdf`;

        const fileUrl = await uploadFileToS3({
          fileBuffer: pdfBuffer,
          fileName,
          contentType: "application/pdf",
        });

        return res.status(200).json({
          success: true,
          message: "PDF exported successfully",
          fileType: "pdf",
          totalRecords: formattedVendors.length,
          downloadUrl: fileUrl,
        });
      });

      // ======================================================
      // TITLE
      // ======================================================

      doc.fontSize(20).font("Helvetica-Bold").text("Vendors Report", {
        align: "center",
      });

      doc.moveDown(1);

      // ======================================================
      // TABLE CONFIG
      // ======================================================

      const tableTop = doc.y;

      const rowHeight = 25;

      const startX = 20;

      const colWidths = {
        no: 35,
        vendor: 120,
        phone: 100,
        email: 160,
        shop: 120,
        gst: 100,
        created: 120,
      };

      // ======================================================
      // DRAW ROW
      // ======================================================

      const drawRow = (y, row, isHeader = false) => {
        let x = startX;

        const columns = [
          { text: row.no, width: colWidths.no },

          { text: row.vendor, width: colWidths.vendor },

          { text: row.phone, width: colWidths.phone },

          { text: row.email, width: colWidths.email },

          { text: row.shop, width: colWidths.shop },

          { text: row.gst, width: colWidths.gst },

          { text: row.created, width: colWidths.created },
        ];

        columns.forEach((col) => {
          if (isHeader) {
            doc
              .rect(x, y, col.width, rowHeight)
              .fillAndStroke("#000000", "#000000");

            doc
              .fillColor("white")
              .font("Helvetica-Bold")
              .fontSize(9)
              .text(col.text, x + 4, y + 8, {
                width: col.width - 8,
                align: "center",
              });
          } else {
            doc.rect(x, y, col.width, rowHeight).stroke("#cccccc");

            doc
              .fillColor("black")
              .font("Helvetica")
              .fontSize(8)
              .text(String(col.text || ""), x + 4, y + 8, {
                width: col.width - 8,
                align: "center",
                ellipsis: true,
              });
          }

          x += col.width;
        });
      };

      // ======================================================
      // HEADER
      // ======================================================

      drawRow(
        tableTop,
        {
          no: "#",
          vendor: "VENDOR",
          phone: "PHONE",
          email: "EMAIL",
          shop: "SHOP",
          gst: "GST",
          created: "CREATED",
        },
        true,
      );

      // ======================================================
      // ROWS
      // ======================================================

      let currentY = tableTop + rowHeight;

      formattedVendors.forEach((vendor, index) => {
        if (currentY > 520) {
          doc.addPage({
            margin: 20,
            size: "A4",
            layout: "landscape",
          });

          currentY = 40;

          drawRow(
            currentY,
            {
              no: "#",
              vendor: "VENDOR",
              phone: "PHONE",
              email: "EMAIL",
              shop: "SHOP",
              gst: "GST",
              created: "CREATED",
            },
            true,
          );

          currentY += rowHeight;
        }

        drawRow(currentY, {
          no: index + 1,

          vendor: vendor.VendorName,

          phone: vendor.Phone,

          email: vendor.Email,

          shop: vendor.ShopName,

          gst: vendor.GSTNumber,

          created: vendor.CreatedAt,
        });

        currentY += rowHeight;
      });

      doc.end();

      return;
    }

    // ======================================================
    // INVALID FILE TYPE
    // ======================================================

    return res.status(400).json({
      success: false,
      message: "Invalid file type. Use csv, excel or pdf",
    });
  } catch (error) {
    next(error);
  }
});
