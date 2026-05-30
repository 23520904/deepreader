import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthRoleGuard } from "@/components/AuthRoleGuard";
import { LazyFloatingHelpChat } from "@/components/LazyFloatingHelpChat";
import { AppPreferencesProvider } from "@/lib/appPreferences";
import { createPageMetadata, siteName, siteUrl, structuredData } from "@/lib/seo";
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
  ...createPageMetadata({
    title: "DeepReader - AI Document Reader, PDF Summarizer, and Study Assistant",
    path: "/",
  }),
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <AppPreferencesProvider>
          <AuthRoleGuard />
          {children}
          <LazyFloatingHelpChat />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
