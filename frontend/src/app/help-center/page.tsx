import type { Metadata } from "next";
import { HelpCenterContent } from "@/components/help/HelpCenterContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Help Center | DeepReader",
  description:
    "Find help articles for reading documents, summaries, flashcards, document chat, and study games in DeepReader.",
  path: "/help-center",
  keywords: ["DeepReader help", "AI document reader guide", "PDF summarizer help"],
});

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-[#eef3fb] text-[#0f172a]">
      <SiteNavbar />
      <HelpCenterContent />
      <SiteFooter />
    </main>
  );
}
