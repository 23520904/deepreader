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
import type { LibraryDocument } from "@/types/library";

export default function FlashcardsPage() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [flashcards, setFlashcards] = useState<StudyFlashcard[]>([]);
  const [studyProgress, setStudyProgress] = useState<
    Record<string, CardProgress>
  >(() => safeReadStorage(STUDY_STATE_KEY, {}));
  const [cardEdits] = useState<Record<string, CardEdit>>(() =>
    safeReadStorage(CARD_EDITS_KEY, {}),
  );
  const [hiddenCardIds] = useState<string[]>(() =>
    safeReadStorage(HIDDEN_CARDS_KEY, []),
  );
  const [query, setQuery] = useState("");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<DeckSortMode>("newest");
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createErrorMessage, setCreateErrorMessage] = useState("");

  useEffect(() => {
    writeStorage(STUDY_STATE_KEY, studyProgress);
  }, [studyProgress]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const token = session.token;
    const displayName = session.username || session.email || "You";
    let ignore = false;

    async function loadFlashcardDecks() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const books = await fetchLibraryBooks(token);
        const libraryDocuments = books.map((book) =>
          mapBackendBook(book, "mine", displayName),
        );
        const readyDocuments = libraryDocuments.filter(
          (document) => document.status === "Ready",
        );
        const cardGroups = await Promise.all(
          readyDocuments.map(async (document) => ({
            document,
            records: await fetchDocumentFlashcards(token, document.id),
          })),
        );

        if (ignore) {
          return;
        }

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

  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "Ready"),
    [documents],
  );
  const visibleCards = useMemo(
    () =>
      applyCardOverrides({
        cards: flashcards,
        cardEdits,
        hiddenCardIds,
      }),
    [cardEdits, flashcards, hiddenCardIds],
  );
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
        const matchesDocument =
          documentFilter === "all" || deck.id === documentFilter;
        const learningStatus = deckLearningStatus(deck);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "new" && learningStatus === "new") ||
          (statusFilter === "learning" && learningStatus === "learning") ||
          (statusFilter === "mastered" && learningStatus === "completed");
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
        if (sortMode === "last-studied") {
          return (
            createdAtTime(right.lastStudied) - createdAtTime(left.lastStudied)
          );
        }

        if (sortMode === "most-cards") {
          return right.totalCards - left.totalCards;
        }

        return createdAtTime(right.createdAt) - createdAtTime(left.createdAt);
      });
  }, [decks, documentFilter, query, sortMode, statusFilter]);

  const totalCards = decks.reduce((total, deck) => total + deck.totalCards, 0);
  const masteredCards = decks.reduce(
    (total, deck) => total + deck.masteredCount,
    0,
  );
  const summaryLine = `${formatCountLabel(decks.length, "deck")} · ${formatCountLabel(
    totalCards,
    "card",
  )} · ${masteredCards} mastered`;

  function deckRoute(
    deckId: string,
    page: "review" | "quiz" | "games" | "cards",
  ) {
    return `/flashcards/${encodeURIComponent(deckId)}/${page}`;
  }

  function resetCreateModal() {
    setCreateStep(1);
    setCreatePreviewCards([]);
    setCreateErrorMessage("");
    setCreateBookId(
      (currentBookId) => currentBookId || readyDocuments[0]?.id || "",
    );
  }

  function openCreateDeck() {
    if (!session) {
      router.push("/login");
      return;
    }

    resetCreateModal();
    setIsCreateModalOpen(true);
  }

  async function generateDeckPreview() {
    if (!session || !createBookId) {
      return;
    }

    const selectedDocument = readyDocuments.find(
      (document) => document.id === createBookId,
    );

    if (!selectedDocument) {
      setCreateErrorMessage("Select a ready document before generating cards.");
      return;
    }

    setIsGenerating(true);
    setCreateErrorMessage("");

    try {
      const payload = await generateDocumentFlashcards({
        token: session.token,
        bookId: selectedDocument.id,
        count: createCount,
      });
      const generatedCards = createGeneratedFlashcardViews(
        selectedDocument.id,
        payload,
      ).map((card) => ({
        ...card,
        bookId: selectedDocument.id,
        bookTitle: selectedDocument.title,
        bookFormat: selectedDocument.format,
      }));

      if (!generatedCards.length) {
        throw new Error("No flashcards were generated.");
      }

      setFlashcards((currentCards) => [...generatedCards, ...currentCards]);
      setStudyProgress((currentProgress) => ({ ...currentProgress }));
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
      <SiteNavbar activeItem="Flashcards" />

      <section className="mx-auto min-w-0 w-[min(1180px,calc(100%_-_48px))] py-8 max-[700px]:w-[min(100%_-_28px,1180px)]">
        <FlashcardsHeader
          summaryLine={summaryLine}
          onCreate={openCreateDeck}
        />

        {errorMessage ? (
          <div className="mt-5 rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-5 py-4 text-[14px] font-bold text-[#be123c]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid min-w-0 gap-6">
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
            <div className="grid min-h-[360px] place-items-center rounded-[18px] border border-[#dbe7f5] bg-white">
              <p className="text-[16px] font-black text-[#2563eb]">
                Loading study decks...
              </p>
            </div>
          ) : !decks.length ? (
            <EmptyDecks onCreate={openCreateDeck} />
          ) : filteredDecks.length ? (
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

      <SiteFooter />
    </main>
  );
}
