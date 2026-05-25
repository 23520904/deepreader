import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthRoleGuard } from "@/components/AuthRoleGuard";
import { LazyFloatingHelpChat } from "@/components/LazyFloatingHelpChat";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeepReader",
  description: "Read smarter and learn faster with DeepReader AI.",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
      {
        url: "/assets/images/brand/deepreader-favicon.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/assets/images/brand/deepreader-favicon.png",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthRoleGuard />
        {children}
        <LazyFloatingHelpChat />
      </body>
    </html>
  );
}
