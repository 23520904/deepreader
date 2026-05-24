export type HelpGuideStep = {
  title: string;
  description: string;
};

export type HelpGuide = {
  slug: string;
  title: string;
  description: string;
  overview: string;
  youtubeEmbedUrl: string;
  primaryAction: {
    label: string;
    href: string;
  };
  steps: HelpGuideStep[];
};

export const helpGuides: HelpGuide[] = [
  {
    slug: "add-documents",
    title: "Add documents",
    description: "Upload study files and keep them in your private library.",
    overview:
      "Use this guide to learn the basic document upload flow, where uploaded files appear, and what to check before using AI study tools.",
    youtubeEmbedUrl: "https://www.youtube.com/embed/zyAcPUviQOE?si=EWR6p0ytJoOqYjio",
    primaryAction: {
      label: "Go to Library",
      href: "/library",
    },
    steps: [
      {
        title: "Open your Library",
        description:
          "Go to the Library page. This is where your uploaded PDFs and study files are organized.",
      },
      {
        title: "Upload a study file",
        description:
          "Choose Upload Document, select your file, and wait until the upload finishes.",
      },
      {
        title: "Check the document card",
        description:
          "After upload, the document card appears in Library. From there, you can read, summarize, create flashcards, or chat with the document.",
      },
    ],
  },
  {
    slug: "study-with-ai",
    title: "Study with AI",
    description: "Open a document and use Summary, Flashcards, or Chat.",
    overview:
      "This guide explains how the AI Study panel works when you are reading a document.",
    youtubeEmbedUrl: "https://www.youtube.com/embed/rohpxmPsIjM?si=u3RdHlH2B-J7Zsv2",
    primaryAction: {
      label: "Open Library",
      href: "/library",
    },
    steps: [
      {
        title: "Open a document",
        description:
          "From Library, choose the document you want to study and open the reader.",
      },
      {
        title: "Use Summary",
        description:
          "Choose Summary to create a clear overview based on the content of the current document.",
      },
      {
        title: "Create flashcards",
        description:
          "Choose Flashcards to generate study cards from important ideas in the document.",
      },
      {
        title: "Ask document questions",
        description:
          "Choose Chat to ask questions grounded in the document you are reading.",
      },
    ],
  },
  {
    slug: "review-flashcards",
    title: "Review flashcards",
    description: "Choose a deck, study cards, take quizzes, or play games.",
    overview:
      "Use this guide to understand the Flashcards page and the study modes available for each deck.",
    youtubeEmbedUrl: "https://www.youtube.com/embed/aDF1lM6OX40?si=8R1YfS6ONG85IJaF",
    primaryAction: {
      label: "Go to Flashcards",
      href: "/flashcards",
    },
    steps: [
      {
        title: "Choose a deck",
        description:
          "Open Flashcards and pick the deck generated from the document you want to review.",
      },
      {
        title: "Study the cards",
        description:
          "Use Study now to open review mode. Read the question, flip the card, and recall the answer.",
      },
      {
        title: "Practice with quiz",
        description:
          "Use quiz mode to test your knowledge with multiple-choice questions.",
      },
      {
        title: "Play mini games",
        description:
          "Use Mini game to practice with Puzzle Match, Speed Challenge, or Memory Flip.",
      },
    ],
  },
];

export function getHelpGuide(slug: string) {
  return helpGuides.find((guide) => guide.slug === slug) ?? null;
}
