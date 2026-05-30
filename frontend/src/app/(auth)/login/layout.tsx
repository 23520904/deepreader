import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Login to DeepReader",
  description:
    "Log in to DeepReader to access your AI document reader, PDF summaries, AI flashcards, and study assistant workspace.",
  path: "/login",
  keywords: ["DeepReader login", "AI document reader login", "study assistant login"],
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
