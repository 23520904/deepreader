import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpGuideContent } from "@/components/help/HelpGuideContent";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getHelpGuide, helpGuides } from "@/lib/helpGuides";
import { createPageMetadata } from "@/lib/seo";

type HelpGuidePageProps = {
  params: Promise<{
    guideSlug: string;
  }>;
};

export function generateStaticParams() {
  return helpGuides.map((guide) => ({
    guideSlug: guide.slug,
  }));
}

export async function generateMetadata({
  params,
}: HelpGuidePageProps): Promise<Metadata> {
  const { guideSlug } = await params;
  const guide = getHelpGuide(guideSlug);

  if (!guide) {
    return {
      title: "Guide not found | DeepReader",
    };
  }

  return createPageMetadata({
    title: `${guide.title} | DeepReader Help Center`,
    description: guide.description,
    path: `/help-center/${guide.slug}`,
    keywords: ["DeepReader guide", "AI document reader help", "study assistant help"],
  });
}

export default async function HelpGuidePage({ params }: HelpGuidePageProps) {
  const { guideSlug } = await params;
  const guide = getHelpGuide(guideSlug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] text-[#0f172a]">
      <SiteNavbar />
      <HelpGuideContent guide={guide} />
      <SiteFooter />
    </main>
  );
}
