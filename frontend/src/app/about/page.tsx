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

export const metadata: Metadata = {
  title: "About | DeepReader",
  description:
    "Learn more about DeepReader, an AI-powered reading and learning support platform.",
};

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
