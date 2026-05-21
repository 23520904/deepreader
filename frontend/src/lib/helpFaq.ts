export type HelpFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type HelpCenterSection = {
  title: string;
  description: string;
  items: HelpFaqItem[];
};

export const helpFaqItems: HelpFaqItem[] = [
  {
    id: "what-is-deepreader",
    question: "What is DeepReader used for?",
    answer:
      "DeepReader helps you store documents, read PDFs, generate summaries, create flashcards, and review knowledge with quizzes or mini games.",
  },
  {
    id: "upload-document",
    question: "How do I add a document?",
    answer:
      "Go to Library, choose Upload Document, then select your PDF or study file. After the upload finishes, the document will appear in your library.",
  },
  {
    id: "read-document",
    question: "Where can I read my document?",
    answer:
      "Open Library, choose a document, then select Read. The reader shows one PDF page at a time. You can use Go to or scroll inside the reading area to move between pages.",
  },
  {
    id: "summary",
    question: "How do I create a summary?",
    answer:
      "Open a document from Library, go to AI Study, then choose Summary. DeepReader will create a summary based on the content of the current document.",
  },
  {
    id: "flashcards",
    question: "Where do I create flashcards?",
    answer:
      "You can create flashcards from the AI Study area inside a document. After generation, the saved decks are collected on the Flashcards page for review.",
  },
  {
    id: "document-chat",
    question: "How does document chat work?",
    answer:
      "In AI Study, choose Chat to ask questions about the document you are reading. This chat is meant for source-based document questions, not general app help.",
  },
  {
    id: "study-games",
    question: "How do flashcard mini games work?",
    answer:
      "Go to Flashcards, choose a deck, then select Mini game. You can play Puzzle Match, Speed Challenge, or Memory Flip to practice the cards in a more interactive way.",
  },
];

export const helpCenterSections: HelpCenterSection[] = [
  {
    title: "Getting Started",
    description: "Set up your workspace and add your first study document.",
    items: [
      helpFaqItems[0],
      helpFaqItems[1],
      {
        id: "supported-files",
        question: "Which files should I upload?",
        answer:
          "DeepReader works best with clear PDF study documents, lecture slides, notes, and structured learning materials. Clean text extraction produces better summaries, flashcards, and document chat answers.",
      },
    ],
  },
  {
    title: "Reading Documents",
    description: "Learn how to move through documents and use the reader.",
    items: [
      helpFaqItems[2],
      {
        id: "go-to-page",
        question: "How do I jump to a specific page?",
        answer:
          "Use the Go to control in the reader, enter the page number, and confirm. You can also scroll inside the reader area to move one page at a time.",
      },
      {
        id: "reading-progress",
        question: "How is reading progress tracked?",
        answer:
          "DeepReader keeps the current reading progress for your document so you can return to your study flow more easily.",
      },
    ],
  },
  {
    title: "AI Study Tools",
    description: "Use summaries, flashcards, and document chat with confidence.",
    items: [
      helpFaqItems[3],
      helpFaqItems[4],
      helpFaqItems[5],
      {
        id: "source-based-answers",
        question: "Why should document chat stay source-based?",
        answer:
          "Document chat is designed to answer from the document you are reading. This keeps answers focused and reduces unrelated or unsupported responses.",
      },
    ],
  },
  {
    title: "Flashcards and Games",
    description: "Review cards, practice quizzes, and play learning games.",
    items: [
      helpFaqItems[6],
      {
        id: "study-deck",
        question: "What is a flashcard deck?",
        answer:
          "A deck is a group of flashcards generated from one document or study section. You can study, quiz, view cards, or open mini games from the deck.",
      },
      {
        id: "review-mode",
        question: "How does review mode work?",
        answer:
          "Review mode shows one flashcard at a time. The front shows the question, and flipping the card reveals the answer so you can practice active recall.",
      },
    ],
  },
];
