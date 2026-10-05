"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { toResult, type ActionError, type ActionResult } from "@/lib/action-result";
import {
  deleteAsset,
  prepareUpload,
  registerUploadedAsset,
  updateAssetAltText,
  type SignedUpload,
} from "@/lib/media/service";

type UploadResult = { ok: true; upload: SignedUpload } | ActionError;
type AssetResult = { ok: true; asset: Awaited<ReturnType<typeof registerUploadedAsset>> } | ActionError;

export async function requestUploadAction(payload: unknown): Promise<UploadResult> {
  try {
    const admin = await requireAdmin();
    return { ok: true, upload: await prepareUpload(admin.id, payload) };
  } catch (error) {
    return toResult(error);
  }
}

export async function finishUploadAction(payload: unknown): Promise<AssetResult> {
  try {
    const admin = await requireAdmin();
    const asset = await registerUploadedAsset(admin.id, payload);
    revalidatePath("/dashboard/media");
    return { ok: true, asset };
  } catch (error) {
    return toResult(error);
  }
}

export async function assetAltAction(payload: unknown): Promise<AssetResult> {
  try {
    const admin = await requireAdmin();
    const asset = await updateAssetAltText(admin.id, payload);
    revalidatePath("/dashboard/media");
    return { ok: true, asset };
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteAssetAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await deleteAsset(admin.id, payload);
    revalidatePath("/dashboard/media");
    return { ok: true, message: "File deleted from Cloudinary and from the library." };
  } catch (error) {
    return toResult(error);
  }
}
