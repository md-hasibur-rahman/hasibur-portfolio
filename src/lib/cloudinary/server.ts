import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@/lib/errors";

export type MediaResourceType = "IMAGE" | "VIDEO";

export type CloudinarySettings = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

// The API secret only ever leaves this module: the browser gets a signature, never the secret.
export function cloudinarySettings(): CloudinarySettings | null {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY ?? "").trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? "").trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: (process.env.CLOUDINARY_FOLDER ?? "").trim() || "portfolio",
  };
}

export function requireCloudinary(): CloudinarySettings {
  const settings = cloudinarySettings();
  if (!settings) throw new AppError("UNAVAILABLE");
  return settings;
}

function sdk(settings: CloudinarySettings) {
  cloudinary.config({
    cloud_name: settings.cloudName,
    api_key: settings.apiKey,
    api_secret: settings.apiSecret,
    signature_algorithm: "sha256",
    secure: true,
  });
  return cloudinary;
}

export function cloudinaryResourcePath(resourceType: MediaResourceType) {
  return resourceType === "IMAGE" ? "image" : "video";
}

export function uploadEndpoint(settings: CloudinarySettings, resourceType: MediaResourceType) {
  return `https://api.cloudinary.com/v1_1/${settings.cloudName}/${cloudinaryResourcePath(resourceType)}/upload`;
}

export function signUploadRequest(
  settings: CloudinarySettings,
  params: { publicId: string; timestamp: number },
) {
  const api = sdk(settings);
  // The public id is the full path (`folder/name`) and is signed as-is. The upload must NOT send
  // the `folder` parameter: Cloudinary concatenates it onto a path-bearing public_id, which stores
  // the file under folder/folder/name while our ticket still points at folder/name (404 on confirm).
  // The client re-sends exactly these keys, so exactly these are covered by the signature.
  return api.utils.api_sign_request(
    { public_id: params.publicId, timestamp: params.timestamp },
    settings.apiSecret,
  );
}

// Cloudinary SDK errors come in two shapes: a plain { http_code } or the API response body
// { error: { message, http_code } } wrapped with request_options — both count as "missing".
type CloudinaryError = { http_code?: number; error?: { http_code?: number } };

function isMissing(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as CloudinaryError;
  return candidate.http_code === 404 || candidate.error?.http_code === 404;
}

export type RemoteAsset = {
  publicId: string;
  secureUrl: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

// Server-side lookup through the Admin API: nothing the browser reports about the uploaded file is
// trusted, the stored URL/dimensions/size come from Cloudinary itself.
export async function fetchUploadedResource(
  publicId: string,
  resourceType: MediaResourceType,
): Promise<RemoteAsset | null> {
  const settings = requireCloudinary();
  const api = sdk(settings);
  try {
    const info = (await api.api.resource(publicId, {
      resource_type: cloudinaryResourcePath(resourceType),
      type: "upload",
    })) as {
      public_id?: string;
      secure_url?: string;
      format?: string;
      width?: number;
      height?: number;
      bytes?: number;
    };
    if (!info?.secure_url) return null;
    return {
      publicId: info.public_id ?? publicId,
      secureUrl: info.secure_url,
      format: info.format ?? null,
      width: typeof info.width === "number" ? info.width : null,
      height: typeof info.height === "number" ? info.height : null,
      bytes: typeof info.bytes === "number" ? info.bytes : null,
    };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

export async function destroyUploadedResource(
  publicId: string,
  resourceType: MediaResourceType,
): Promise<"destroyed" | "already-gone"> {
  const api = sdk(requireCloudinary());
  try {
    await api.uploader.destroy(publicId, {
      resource_type: cloudinaryResourcePath(resourceType),
    });
    return "destroyed";
  } catch (error) {
    if (isMissing(error)) return "already-gone";
    throw error;
  }
}
