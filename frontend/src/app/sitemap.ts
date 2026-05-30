import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const publicRoutes = ["/", "/about", "/contact", "/login", "/signup", "/help-center"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
