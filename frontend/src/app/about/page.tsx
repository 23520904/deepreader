import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { HomeScrollReveal } from "@/components/home/HomeScrollReveal";
import { AboutGoalCTA } from "@/components/about/AboutGoalCTA";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutMission } from "@/components/about/AboutMission";
import { AboutQuickLinks } from "@/components/about/AboutQuickLinks";
import { AboutStory } from "@/components/about/AboutStory";
import { AboutWorkSteps } from "@/components/about/AboutWorkSteps";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "About DeepReader",
  description:
    "Learn about DeepReader, an AI document reader and study assistant built for PDF summaries, AI flashcards, and source-based learning.",
  path: "/about",
  keywords: ["about DeepReader", "AI learning platform", "AI study assistant"],
});

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#eef1f8] text-[#1d355b]">
      <HomeScrollReveal />
      <SiteNavbar activeItem="About" />
      <AboutHero />
      <AboutWorkSteps />
      <AboutStory />
      <AboutMission />
      <AboutGoalCTA />
      <AboutQuickLinks />
      <SiteFooter />
    </main>
  );
}
