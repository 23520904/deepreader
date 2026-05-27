import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#e9ecf4] text-[#17345d]">
      <SiteNavbar activeItem="Profile" />
      <ProfileEditor />
      <SiteFooter />
    </main>
  );
}
