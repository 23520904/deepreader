import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Forgot Password | DeepReader",
  description:
    "Reset access to your DeepReader AI document reader and study assistant account.",
  path: "/forgot-password",
  keywords: ["DeepReader forgot password", "DeepReader account recovery"],
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
