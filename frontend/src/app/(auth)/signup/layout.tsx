import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sign Up for DeepReader",
  description:
    "Create a DeepReader account to summarize PDFs, read documents with AI, generate AI flashcards, and study with a focused AI assistant.",
  path: "/signup",
  keywords: ["DeepReader signup", "AI flashcards signup", "PDF summarizer account"],
});

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
