import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import createError from "http-errors";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: process.env.LINODE_OBJECT_STORAGE_REGION,
  endpoint: process.env.LINODE_OBJECT_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const bucket = process.env.LINODE_OBJECT_BUCKET;
const folderPath = process.env.BUCKET_FOLDER_PATH || "";
const localUploadPath = path.join(process.cwd(), "uploads");

export const multerFilter = (req, file, cb) => {
  if (
    file.fieldname === "effectOfAr" &&
    file.mimetype !== "application/octet-stream"
  ) {
    return cb(createError(400, "Only .deeper format allowed!"), false);
  }

  if (file.fieldname === "threeDModelData" && file.mimetype !== "model/obj") {
    return cb(createError(400, "Only .obj format allowed!"), false);
  }

  if (file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  cb(null, true);
};

export const generateFileName = (file) => {
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  return `${folderPath}${file.fieldname}-${timestamp}${ext}`;
};

export const s3Uploader = () =>
  multer({
    fileFilter: multerFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max (video case)
    },
    storage: multerS3({
      s3,
      bucket,
      acl: "public-read",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        cb(null, generateFileName(file));
      },
    }),
  });

export const localUploader = () =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        if (!fs.existsSync(localUploadPath)) {
          fs.mkdirSync(localUploadPath, { recursive: true });
        }
        cb(null, localUploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  });

export const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return s3.send(command);
};

export const getBuffer = async (bucketName, key) => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const response = await s3.send(command);

  if (response.Body instanceof Readable) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      response.Body.on("data", (chunk) => chunks.push(chunk));
      response.Body.on("error", reject);
      response.Body.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  return response.Body;
};
