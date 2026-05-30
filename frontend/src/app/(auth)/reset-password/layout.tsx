import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Reset Password | DeepReader",
  description: "Set a new password for your DeepReader study assistant account.",
  path: "/reset-password",
  keywords: ["DeepReader reset password", "DeepReader account security"],
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
