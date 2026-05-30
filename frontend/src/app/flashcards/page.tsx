"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CreateDeckModal } from "@/components/flashcards/library/CreateDeckModal";
import { DeckCard } from "@/components/flashcards/library/DeckCard";
import { EmptyDecks } from "@/components/flashcards/library/EmptyDecks";
import { FlashcardsHeader } from "@/components/flashcards/library/FlashcardsHeader";
import { FlashcardsToolbar } from "@/components/flashcards/library/FlashcardsToolbar";
import {
  deckLearningStatus,
  formatCountLabel,
} from "@/components/flashcards/library/flashcardLibraryHelpers";
import type { CreateStep } from "@/components/flashcards/library/types";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import {
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";
import {
  applyCardOverrides,
  buildStudyDecks,
  CARD_EDITS_KEY,
  createdAtTime,
  HIDDEN_CARDS_KEY,
  safeReadStorage,
  STUDY_STATE_KEY,
  writeStorage,
  type CardEdit,
  type CardProgress,
  type DeckSortMode,
  type StatusFilter,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
import { mapBackendBook } from "@/lib/library";
import {
  createGeneratedFlashcardViews,
  normalizeFlashcardRecords,
} from "@/lib/reading";
import { fetchLibraryBooks } from "@/services/libraryService";
import {
  fetchDocumentFlashcards,
  generateDocumentFlashcards,
} from "@/services/readingService";
import {
  fetchStudyProgress,
  studyProgressRecordsToState,
} from "@/services/studyProgressService";
import type { LibraryDocument } from "@/types/library";

/**
 * Flashcards library page.
 * This page loads the user's ready documents, fetches flashcards for each document,
 * shows study decks, and lets the user generate new AI flashcards.
 */
export default function FlashcardsPage() {
  const router = useRouter();

  // Keep the page synced with the current auth session.
  // useSyncExternalStore is used because auth session can change outside this component.
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  // Main data state loaded from the backend.
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [flashcards, setFlashcards] = useState<StudyFlashcard[]>([]);

  // Study progress is initialized from local storage so progress is available immediately.
  const [studyProgress, setStudyProgress] = useState<
    Record<string, CardProgress>
  >(() => safeReadStorage(STUDY_STATE_KEY, {}));

  // Local card edits and hidden card IDs are read once and applied to the visible card list.
  const [cardEdits] = useState<Record<string, CardEdit>>(() =>
    safeReadStorage(CARD_EDITS_KEY, {}),
  );
  const [hiddenCardIds] = useState<string[]>(() =>
    safeReadStorage(HIDDEN_CARDS_KEY, []),
  );

  // Toolbar filter and sort state.
  const [query, setQuery] = useState("");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<DeckSortMode>("newest");

  // Create deck modal state.
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>(1);
  const [createBookId, setCreateBookId] = useState("");
  const [createCount, setCreateCount] = useState(20);
  const [createLanguage, setCreateLanguage] = useState("English");
  const [createType, setCreateType] = useState("Mixed");
  const [createScope, setCreateScope] = useState("Whole document");
  const [createPreviewCards, setCreatePreviewCards] = useState<StudyFlashcard[]>(
    [],
  );

  // Loading and error state for page loading and AI generation.
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createErrorMessage, setCreateErrorMessage] = useState("");

  useEffect(() => {
    // Persist local study progress whenever it changes.
    writeStorage(STUDY_STATE_KEY, studyProgress);
  }, [studyProgress]);

  useEffect(() => {
    // Do not load private flashcard data until the user is authenticated.
    if (!session) {
      return;
    }

    const token = session.token;
    const displayName = session.username || session.email || "You";

    // Prevent state updates after this effect is cleaned up.
    let ignore = false;

    /**
     * Loads the flashcard library data for the current user.
     * The page loads books and study progress first, then fetches flashcards
     * only for documents that are ready to study.
     */
    async function loadFlashcardDecks() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        // Load library books and remote progress in parallel for faster page startup.
        // Study progress failure is tolerated so the deck list can still be shown.
        const [books, remoteProgressRecords] = await Promise.all([
          fetchLibraryBooks(token),
          fetchStudyProgress(token).catch(() => []),
        ]);

        // Convert backend book records into the document shape used by the UI.
        const libraryDocuments = books.map((book) =>
          mapBackendBook(book, "mine", displayName),
        );

        // Flashcards can only be fetched for documents that finished processing.
        const readyDocuments = libraryDocuments.filter(
          (document) => document.status === "Ready",
        );

        // Fetch flashcard records for each ready document.
        const cardGroups = await Promise.all(
          readyDocuments.map(async (document) => ({
            document,
            records: await fetchDocumentFlashcards(token, document.id),
          })),
        );

        if (ignore) {
          return;
        }

        // Normalize backend flashcard records and attach document metadata for deck grouping.
        const nextFlashcards = cardGroups
          .flatMap(({ document, records }) =>
            normalizeFlashcardRecords(records ?? []).map((card) => ({
              ...card,
              bookId: document.id,
              bookTitle: document.title,
              bookFormat: document.format,
            })),
          )
          .sort(
            (left, right) =>
              createdAtTime(right.createdAt) - createdAtTime(left.createdAt),
          );

        setDocuments(libraryDocuments);
        setFlashcards(nextFlashcards);

        // Merge remote progress with current local progress.
        // Local progress wins when both sources contain the same card.
        setStudyProgress((currentProgress) => ({
          ...studyProgressRecordsToState(remoteProgressRecords),
          ...currentProgress,
        }));

        // Select the first ready document as the default create-deck source.
        setCreateBookId(
          (currentBookId) => currentBookId || readyDocuments[0]?.id || "",
        );
      } catch (error) {
        if (!ignore) {
          setDocuments([]);
          setFlashcards([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load flashcard decks.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadFlashcardDecks();

    return () => {
      ignore = true;
    };
  }, [session]);

  // Documents that can be used for flashcard generation.
  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "Ready"),
    [documents],
  );

  // Apply local edits and hidden-card settings before building decks.
  const visibleCards = useMemo(
    () =>
      applyCardOverrides({
        cards: flashcards,
        cardEdits,
        hiddenCardIds,
      }),
    [cardEdits, flashcards, hiddenCardIds],
  );

  // Group visible flashcards into study decks by document.
  const decks = useMemo(
    () =>
      buildStudyDecks({
        documents,
        cards: visibleCards,
        studyProgress,
      }),
    [documents, studyProgress, visibleCards],
  );

  const filteredDecks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return decks
      .filter((deck) => {
        // Document filter keeps only the selected document deck.
        const matchesDocument =
          documentFilter === "all" || deck.id === documentFilter;

        // Status filter is based on the current learning state of the deck.
        const learningStatus = deckLearningStatus(deck);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "new" && learningStatus === "new") ||
          (statusFilter === "learning" && learningStatus === "learning") ||
          (statusFilter === "mastered" && learningStatus === "completed");

        // Search checks both deck title and the content of cards inside the deck.
        const matchesQuery =
          !normalizedQuery ||
          deck.title.toLowerCase().includes(normalizedQuery) ||
          deck.cards.some(
            (card) =>
              card.question.toLowerCase().includes(normalizedQuery) ||
              card.answer.toLowerCase().includes(normalizedQuery),
          );

        return matchesDocument && matchesStatus && matchesQuery;
      })
      .sort((left, right) => {
        // Sort by last study time when the user wants recently studied decks first.
        if (sortMode === "last-studied") {
          return (
            createdAtTime(right.lastStudied) - createdAtTime(left.lastStudied)
          );
        }

        // Sort by deck size when the user wants decks with more cards first.
        if (sortMode === "most-cards") {
          return right.totalCards - left.totalCards;
        }

        // Default sorting shows the newest decks first.
        return createdAtTime(right.createdAt) - createdAtTime(left.createdAt);
      });
  }, [decks, documentFilter, query, sortMode, statusFilter]);

  // Summary numbers shown in the flashcards page header.
  const totalCards = decks.reduce((total, deck) => total + deck.totalCards, 0);
  const masteredCards = decks.reduce(
    (total, deck) => total + deck.masteredCount,
    0,
  );
  const summaryLine = `${formatCountLabel(decks.length, "deck")} · ${formatCountLabel(
    totalCards,
    "card",
  )} · ${masteredCards} mastered`;

  /**
   * Builds a route to a specific flashcard deck page.
   * encodeURIComponent keeps document IDs safe inside the URL path.
   */
  function deckRoute(
    deckId: string,
    page: "review" | "quiz" | "games" | "cards",
  ) {
    return `/flashcards/${encodeURIComponent(deckId)}/${page}`;
  }

  /**
   * Resets the create deck modal to its first step.
   * Existing selected book is kept when possible for a smoother user flow.
   */
  function resetCreateModal() {
    setCreateStep(1);
    setCreatePreviewCards([]);
    setCreateErrorMessage("");
    setCreateBookId(
      (currentBookId) => currentBookId || readyDocuments[0]?.id || "",
    );
  }

  /**
   * Opens the AI flashcard generation modal.
   * Unauthenticated users are redirected to login before creating cards.
   */
  function openCreateDeck() {
    if (!session) {
      router.push("/login");
      return;
    }

    resetCreateModal();
    setIsCreateModalOpen(true);
  }

  /**
   * Generates a preview deck from the selected document and create settings.
   * The UI labels are converted into backend codes before calling the API.
   */
  async function generateDeckPreview() {
    if (!session || !createBookId) {
      return;
    }

    const selectedDocument = readyDocuments.find(
      (document) => document.id === createBookId,
    );

    // Generation is only allowed for documents that are ready and selectable.
    if (!selectedDocument) {
      setCreateErrorMessage("Select a ready document before generating cards.");
      return;
    }

    setIsGenerating(true);
    setCreateErrorMessage("");

    // Convert the language selected in the UI into the API language code.
    let languageCode = "en";
    if (createLanguage === "Vietnamese") {
      languageCode = "vi";
    } else if (createLanguage === "Bilingual") {
      languageCode = "bilingual";
    }

    // Convert the card type selected in the UI into the API type code.
    let typeCode = "mixed";
    if (createType === "Definition" || createType === "Concept") {
      typeCode = "concept";
    } else if (createType === "Comparison") {
      typeCode = "question";
    } else if (createType === "Example") {
      typeCode = "practical";
    }

    // Convert the selected document scope into the API scope code.
    let scopeCode = "all";
    if (createScope === "Key sections") {
      scopeCode = "key-sections";
    } else if (createScope === "Weak topics") {
      scopeCode = "weak-topics";
    }

    try {
      const payload = await generateDocumentFlashcards({
        token: session.token,
        bookId: selectedDocument.id,
        count: createCount,
        language: languageCode,
        type: typeCode,
        scope: scopeCode,
      });

      // Convert generated API records into flashcard views used by the deck UI.
      const generatedCards = createGeneratedFlashcardViews(
        selectedDocument.id,
        payload,
      ).map((card) => ({
        ...card,
        bookId: selectedDocument.id,
        bookTitle: selectedDocument.title,
        bookFormat: selectedDocument.format,
      }));

      // Treat an empty generation result as an error so the user gets clear feedback.
      if (!generatedCards.length) {
        throw new Error("No flashcards were generated.");
      }

      // Add newly generated cards to the top of the current library.
      setFlashcards((currentCards) => [...generatedCards, ...currentCards]);

      // Trigger progress state update without changing existing progress values.
      setStudyProgress((currentProgress) => ({ ...currentProgress }));

      // Move the modal to preview step after generation succeeds.
      setCreatePreviewCards(generatedCards);
      setCreateStep(3);
    } catch (error) {
      setCreateErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not generate flashcards.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f9fe] text-[#0f172a]">
      {/* Main navigation section with Flashcards highlighted. */}
      <SiteNavbar activeItem="Flashcards" />

      {/* Main flashcards library content section. */}
      <section className="mx-auto min-w-0 w-[min(1180px,calc(100%_-_48px))] py-8 max-[700px]:w-[min(100%_-_28px,1180px)]">
        {/* Page header with summary and create-deck action. */}
        <FlashcardsHeader
          summaryLine={summaryLine}
          onCreate={openCreateDeck}
        />

        {/* Page-level error message shown when loading decks fails. */}
        {errorMessage ? (
          <div className="mt-5 rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-5 py-4 text-[14px] font-bold text-[#be123c]">
            {errorMessage}
          </div>
        ) : null}

        {/* Deck toolbar and deck list section. */}
        <section className="mt-6 grid min-w-0 gap-6">
          {/* Search, document filter, status filter, and sort controls. */}
          <FlashcardsToolbar
            decks={decks}
            query={query}
            documentFilter={documentFilter}
            statusFilter={statusFilter}
            sortMode={sortMode}
            onQueryChange={setQuery}
            onDocumentFilterChange={setDocumentFilter}
            onStatusFilterChange={setStatusFilter}
            onSortModeChange={setSortMode}
          />

          {isLoading ? (
            /* Loading state while documents, progress, and flashcards are being fetched. */
            <div className="grid min-h-[360px] place-items-center rounded-[18px] border border-[#dbe7f5] bg-white">
              <p className="text-[16px] font-black text-[#2563eb]">
                Loading study decks...
              </p>
            </div>
          ) : !decks.length ? (
            /* Empty state when the user has no available study decks. */
            <EmptyDecks onCreate={openCreateDeck} />
          ) : filteredDecks.length ? (
            /* Deck grid shown when filters return at least one deck. */
            <section className="grid gap-4">
              <h2 className="text-[22px] font-black text-[#0f172a]">
                All decks
              </h2>
              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                {filteredDecks.map((deck) => (
                  <DeckCard key={deck.id} deck={deck} deckRoute={deckRoute} />
                ))}
              </div>
            </section>
          ) : (
            /* Empty filter result shown when decks exist but none match the filters. */
            <div className="rounded-[18px] border border-[#dbe7f5] bg-white px-6 py-12 text-center">
              <h2 className="text-[24px] font-black text-[#0f172a]">
                No decks match your filters
              </h2>
              <p className="mt-2 text-[15px] font-semibold text-[#64748b]">
                Try clearing search, document, or status filters.
              </p>
            </div>
          )}
        </section>
      </section>

      {/* AI create deck modal section. */}
      {isCreateModalOpen ? (
        <CreateDeckModal
          documents={documents}
          createStep={createStep}
          createBookId={createBookId}
          createCount={createCount}
          createLanguage={createLanguage}
          createType={createType}
          createScope={createScope}
          createPreviewCards={createPreviewCards}
          createErrorMessage={createErrorMessage}
          isGenerating={isGenerating}
          onClose={() => setIsCreateModalOpen(false)}
          onStepChange={setCreateStep}
          onBookChange={setCreateBookId}
          onCountChange={setCreateCount}
          onLanguageChange={setCreateLanguage}
          onTypeChange={setCreateType}
          onScopeChange={setCreateScope}
          onGenerate={generateDeckPreview}
        />
      ) : null}

      {/* Footer section. */}
      <SiteFooter />
    </main>
  );
}