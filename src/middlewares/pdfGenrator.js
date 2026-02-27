import puppeteer from "puppeteer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import logger from "../utils/logger.js";



export const generateAndSaveInvoice = async ({ html, code }) => {
    let browser;

    try {
        browser = await puppeteer.launch({
            ignoreDefaultArgs: ["--disable-extensions"],
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
        });

        logger.info(`PDF generated for invoice: ${code} (${pdfBuffer.length} bytes)`);

        const s3Client = new S3Client({
            region: process.env.LINODE_OBJECT_STORAGE_REGION,
            endpoint: process.env.LINODE_OBJECT_STORAGE_ENDPOINT,
            forcePathStyle: false,
            credentials: {
                accessKeyId: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID,
                secretAccessKey: process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
            },
        });

        const key = `${process.env.BUCKET_FOLDER_PATH || "Configuration/"}${code}.pdf`;

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.LINODE_OBJECT_BUCKET || "satyakabir-bucket",
            Key: key,
            Body: pdfBuffer,
            ACL: "public-read",
            ContentType: "application/pdf",
        });

        await s3Client.send(uploadCommand);

        const endpoint = process.env.LINODE_OBJECT_STORAGE_ENDPOINT;
        const bucket = process.env.LINODE_OBJECT_BUCKET;
        const publicUrl = `${endpoint}/${bucket}/${key}`;

        logger.info(`Invoice uploaded successfully: ${publicUrl}`);
        console.log("Upload Success:", publicUrl);

        return publicUrl;
    } catch (error) {
        logger.error(`generateAndSaveInvoice error [${code}]: ${error.message}`);
        console.error("Invoice generation error:", error.message);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};
