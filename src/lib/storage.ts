import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { AppError } from "@/lib/errors";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/** False until CLOUDINARY_* env vars are set — callers should hide upload UI / skip uploads until then. */
export const isStorageConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isStorageConfigured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

export type UploadedFile = {
  fileName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number;
};

export async function uploadFile(file: File, folder: string): Promise<UploadedFile> {
  if (!isStorageConfigured) {
    throw new AppError("BAD_REQUEST", "File storage is not configured yet.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, uploadResult) => {
        if (error || !uploadResult) reject(error ?? new Error("Upload failed"));
        else resolve(uploadResult);
      },
    );
    stream.end(buffer);
  });

  return {
    fileName: file.name,
    url: result.secure_url,
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}
