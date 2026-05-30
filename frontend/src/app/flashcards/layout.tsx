import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flashcards | DeepReader",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
