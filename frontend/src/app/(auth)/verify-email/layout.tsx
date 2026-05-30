import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Verify Email | DeepReader",
  description:
    "Verify your email address to finish setting up DeepReader AI document reader access.",
  path: "/verify-email",
  keywords: ["DeepReader email verification", "verify DeepReader account"],
});

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
