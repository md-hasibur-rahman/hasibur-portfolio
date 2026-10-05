import type { Metadata } from "next";
import { ProfileForm, type ProfileFormValues } from "@/components/dashboard/profile-form";
import { requireAdmin } from "@/lib/auth/guards";
import { getProfile } from "@/lib/profile/service";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const profile = await getProfile(admin.id);

  const values: ProfileFormValues = {
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    website: profile?.website ?? "",
    githubUrl: profile?.githubUrl ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    twitterUrl: profile?.twitterUrl ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-rise flex flex-col gap-2">
        <p className="eyebrow">Dashboard</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {admin.email} ({admin.role.toLowerCase()}). Your session details live under
          /account.
        </p>
      </header>
      <div className="animate-rise-soft max-w-3xl">
        <ProfileForm values={values} />
      </div>
    </div>
  );
}
