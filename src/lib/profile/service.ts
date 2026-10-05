import type { ZodError } from "zod";
import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { logAction } from "@/lib/audit";
import { profileSchema } from "@/lib/validations/profile";

function invalid(error: ZodError): never {
  throw new AppError("VALIDATION", { details: { fields: error.flatten().fieldErrors } });
}

function orNull(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

export function getProfile(userId: string) {
  return db.profile.findUnique({ where: { userId } });
}

export async function updateProfile(userId: string, input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error);
  const data = parsed.data;

  const values = {
    bio: orNull(data.bio),
    location: orNull(data.location),
    website: orNull(data.website),
    githubUrl: orNull(data.githubUrl),
    linkedinUrl: orNull(data.linkedinUrl),
    twitterUrl: orNull(data.twitterUrl),
  };

  await db.profile.upsert({
    where: { userId },
    update: values,
    create: { userId, ...values },
  });

  await logAction({ action: "profile.update", resource: "profile", resourceId: userId, userId });
  return values;
}
