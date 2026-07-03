import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { ProfileScreen } from "@/components/settings/ProfileScreen";

export const metadata = { title: "Profile · SpectraForge" };

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return <ProfileScreen name={profile.name} company={profile.company} email={profile.email} role={profile.role} />;
}
