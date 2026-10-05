"use server";

import { revalidatePath } from "next/cache";
import { requireVaultAccess } from "@/lib/auth/guards";
import { toResult, type ActionError, type ActionResult } from "@/lib/action-result";
import type { RevealedValue, VaultItemSummary, ApiCredentialSummary } from "@/lib/vault/service";
import {
  createApiCredential,
  createVaultItem,
  deleteApiCredential,
  deleteVaultItem,
  revealApiCredential,
  revealVaultItem,
  updateApiCredential,
  updateVaultItem,
} from "@/lib/vault/service";

type VaultItemResult = { ok: true; item: VaultItemSummary } | ActionError;
type CredentialResult = { ok: true; credential: ApiCredentialSummary } | ActionError;
// The decrypted value travels straight back to the caller of the action and is never logged.
type RevealResult = { ok: true; reveal: RevealedValue } | ActionError;

export async function createVaultItemAction(payload: unknown): Promise<VaultItemResult> {
  try {
    const admin = await requireVaultAccess();
    const item = await createVaultItem(admin.id, payload);
    revalidatePath("/dashboard/vault");
    return { ok: true, item };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateVaultItemAction(payload: unknown): Promise<VaultItemResult> {
  try {
    const admin = await requireVaultAccess();
    const item = await updateVaultItem(admin.id, payload);
    revalidatePath("/dashboard/vault");
    return { ok: true, item };
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteVaultItemAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireVaultAccess();
    await deleteVaultItem(admin.id, payload);
    revalidatePath("/dashboard/vault");
    return { ok: true, message: "Entry deleted." };
  } catch (error) {
    return toResult(error);
  }
}

export async function revealVaultItemAction(payload: unknown): Promise<RevealResult> {
  try {
    const admin = await requireVaultAccess();
    return { ok: true, reveal: await revealVaultItem(admin.id, payload) };
  } catch (error) {
    return toResult(error);
  }
}

export async function createCredentialAction(payload: unknown): Promise<CredentialResult> {
  try {
    const admin = await requireVaultAccess();
    const credential = await createApiCredential(admin.id, payload);
    revalidatePath("/dashboard/credentials");
    return { ok: true, credential };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateCredentialAction(payload: unknown): Promise<CredentialResult> {
  try {
    const admin = await requireVaultAccess();
    const credential = await updateApiCredential(admin.id, payload);
    revalidatePath("/dashboard/credentials");
    return { ok: true, credential };
  } catch (error) {
    return toResult(error);
  }
}

export async function deleteCredentialAction(payload: unknown): Promise<ActionResult> {
  try {
    const admin = await requireVaultAccess();
    await deleteApiCredential(admin.id, payload);
    revalidatePath("/dashboard/credentials");
    return { ok: true, message: "Credential deleted." };
  } catch (error) {
    return toResult(error);
  }
}

export async function revealCredentialAction(payload: unknown): Promise<RevealResult> {
  try {
    const admin = await requireVaultAccess();
    return { ok: true, reveal: await revealApiCredential(admin.id, payload) };
  } catch (error) {
    return toResult(error);
  }
}
