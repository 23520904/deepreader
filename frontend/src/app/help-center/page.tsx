import type { Metadata } from "next";
import { HelpCenterContent } from "@/components/help/HelpCenterContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";

export const metadata: Metadata = {
  title: "Help Center | DeepReader",
  description:
    "Find help articles for reading documents, summaries, flashcards, document chat, and study games in DeepReader.",
};

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-[#eef3fb] text-[#0f172a]">
      <SiteNavbar />
      <HelpCenterContent />
      <SiteFooter />
    </main>
  );
}
