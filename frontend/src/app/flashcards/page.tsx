"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  DOCUMENT_ICON,
  formatDate,
  formatShortDate,
  HIDDEN_CARDS_KEY,
  safeReadStorage,
  STACK_ICON,
  STUDY_STATE_KEY,
  writeStorage,
  type CardEdit,
  type CardProgress,
  type DeckSortMode,
  type StatusFilter,
  type StudyDeck,
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

type CreateStep = 1 | 2 | 3;

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
  const [createDifficulty, setCreateDifficulty] = useState("Medium");
  const [createLanguage, setCreateLanguage] = useState("English");
  const [createType, setCreateType] = useState("Mixed");
  const [createScope, setCreateScope] = useState("Whole document");
  const [createPreviewCards, setCreatePreviewCards] = useState<StudyFlashcard[]>(
    [],
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [createErrorMessage, setCreateErrorMessage] = useState("");

  useEffect(() => {
    writeStorage(STUDY_STATE_KEY, studyProgress);
  }, [studyProgress]);

  useEffect(() => {
    if (!session) {
      router.push("/login");
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
        setCreateBookId((currentBookId) => currentBookId || readyDocuments[0]?.id || "");
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
  }, [router, session]);

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
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "new" && deck.newCount > 0) ||
          (statusFilter === "learning" && deck.learningCount > 0) ||
          (statusFilter === "mastered" && deck.masteredCount > 0) ||
          (statusFilter === "weak" && deck.weakCount > 0);
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
          return createdAtTime(right.lastStudied) - createdAtTime(left.lastStudied);
        }

        if (sortMode === "most-cards") {
          return right.totalCards - left.totalCards;
        }

        if (sortMode === "lowest-accuracy") {
          return (left.accuracy ?? 0) - (right.accuracy ?? 0);
        }

        if (sortMode === "highest-progress") {
          return right.progress - left.progress;
        }

        return createdAtTime(right.createdAt) - createdAtTime(left.createdAt);
      });
  }, [decks, documentFilter, query, sortMode, statusFilter]);

  const totalCards = decks.reduce((total, deck) => total + deck.totalCards, 0);
  const masteredCards = decks.reduce(
    (total, deck) => total + deck.masteredCount,
    0,
  );
  const totalAttempts = visibleCards.reduce(
    (total, card) => total + (studyProgress[card.id]?.attempts ?? 0),
    0,
  );
  const totalCorrect = visibleCards.reduce(
    (total, card) => total + (studyProgress[card.id]?.correct ?? 0),
    0,
  );
  const overallAccuracy = totalAttempts
    ? Math.round((totalCorrect / totalAttempts) * 100)
    : 0;

  function deckRoute(deckId: string, page: "review" | "quiz" | "games" | "cards") {
    return `/flashcards/${encodeURIComponent(deckId)}/${page}`;
  }

  function resetCreateModal() {
    setCreateStep(1);
    setCreatePreviewCards([]);
    setCreateErrorMessage("");
    setCreateBookId((currentBookId) => currentBookId || readyDocuments[0]?.id || "");
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
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <SiteNavbar activeItem="Flashcards" />

      <section className="mx-auto w-[min(1220px,calc(100%_-_48px))] py-8 max-[700px]:w-[min(100%_-_28px,1220px)]">
        <div className="rounded-[8px] border border-[#dbe7f5] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div>
              <p className="text-[14px] font-bold text-[#2563eb]">Study Deck</p>
              <h1 className="mt-1 text-[clamp(34px,4vw,52px)] font-black leading-tight text-[#0f172a]">
                Flashcard Study Hub
              </h1>
              <p className="mt-3 max-w-[650px] text-[16px] font-semibold leading-7 text-[#64748b]">
                Review, practice, and master flashcards generated from your
                documents.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetCreateModal();
                  setIsCreateModalOpen(true);
                }}
                className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center gap-3 rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8]"
              >
                <Image src={STACK_ICON} alt="" width={22} height={22} />
                Create from Documents
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {[
                ["Cards", totalCards.toString(), "Total study cards"],
                ["Decks", decks.length.toString(), "Document decks"],
                ["Mastered", masteredCards.toString(), "Cards marked easy"],
                ["Accuracy", `${overallAccuracy}%`, "Across practice"],
              ].map(([label, value, helper]) => (
                <div
                  key={label}
                  className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4"
                >
                  <p className="text-[13px] font-bold text-[#64748b]">{label}</p>
                  <p className="mt-2 text-[32px] font-black leading-none text-[#0f172a]">
                    {value}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold text-[#94a3b8]">
                    {helper}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-5 py-4 text-[14px] font-bold text-[#be123c]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5">
          <div className="rounded-[8px] border border-[#dbe7f5] bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.3fr)_minmax(180px,0.8fr)_160px_190px]">
              <label className="grid gap-2 text-[13px] font-bold text-[#64748b]">
                Search
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Deck, question, answer"
                  className="h-11 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb]"
                />
              </label>

              <label className="grid gap-2 text-[13px] font-bold text-[#64748b]">
                Document
                <select
                  value={documentFilter}
                  onChange={(event) => setDocumentFilter(event.target.value)}
                  className="h-11 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb]"
                >
                  <option value="all">All documents</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-[13px] font-bold text-[#64748b]">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="h-11 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb]"
                >
                  <option value="all">All</option>
                  <option value="new">New</option>
                  <option value="learning">Learning</option>
                  <option value="mastered">Mastered</option>
                  <option value="weak">Weak</option>
                </select>
              </label>

              <label className="grid gap-2 text-[13px] font-bold text-[#64748b]">
                Sort
                <select
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(event.target.value as DeckSortMode)
                  }
                  className="h-11 rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb]"
                >
                  <option value="newest">Newest</option>
                  <option value="last-studied">Last studied</option>
                  <option value="most-cards">Most cards</option>
                  <option value="lowest-accuracy">Lowest accuracy</option>
                  <option value="highest-progress">Highest progress</option>
                </select>
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className="grid min-h-[430px] place-items-center rounded-[8px] border border-[#dbe7f5] bg-white">
              <p className="text-[16px] font-black text-[#2563eb]">
                Loading study decks...
              </p>
            </div>
          ) : !decks.length ? (
            <EmptyDecks onCreate={() => setIsCreateModalOpen(true)} />
          ) : filteredDecks.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredDecks.map((deck) => (
                <DeckCard key={deck.id} deck={deck} deckRoute={deckRoute} />
              ))}
            </div>
          ) : (
            <div className="rounded-[8px] border border-[#dbe7f5] bg-white px-6 py-12 text-center">
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
          createDifficulty={createDifficulty}
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
          onDifficultyChange={setCreateDifficulty}
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

function DeckCard({
  deck,
  deckRoute,
}: {
  deck: StudyDeck;
  deckRoute: (
    deckId: string,
    page: "review" | "quiz" | "games" | "cards",
  ) => string;
}) {
  return (
    <article className="rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[12px] font-black text-[#1d4ed8]">
              {deck.format}
            </span>
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[12px] font-black text-[#64748b] ring-1 ring-[#e2e8f0]">
              {deck.reviewedCount
                ? `Last studied: ${formatShortDate(deck.lastStudied)}`
                : "New deck"}
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-[22px] font-black leading-snug text-[#0f172a]">
            {deck.title}
          </h2>
          <p className="mt-2 truncate text-[14px] font-semibold text-[#64748b]">
            Source document: {deck.sourceTitle}
          </p>
        </div>
        <Image
          src={DOCUMENT_ICON}
          alt=""
          width={54}
          height={54}
          className="h-14 w-14 shrink-0 rounded-[8px] object-cover"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Cards", deck.totalCards],
          ["Mastered", deck.masteredCount],
          ["Learning", deck.learningCount],
          ["Weak", deck.weakCount],
          ["Accuracy", deck.accuracy === null ? "-" : `${deck.accuracy}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[8px] bg-[#f8fafc] px-3 py-3 ring-1 ring-[#e2e8f0]"
          >
            <p className="text-[12px] font-bold text-[#64748b]">{label}</p>
            <p className="mt-1 text-[20px] font-black text-[#0f172a]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-[13px] font-bold text-[#64748b]">
          <span>Mastery progress</span>
          <span>{deck.progress}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-[#10b981]"
            style={{ width: `${deck.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={deckRoute(deck.id, "review")}
          className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
        >
          Review
        </Link>
        <Link
          href={deckRoute(deck.id, "quiz")}
          className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#eff6ff] px-5 text-[14px] font-black text-[#1d4ed8] transition hover:bg-[#dbeafe]"
        >
          Quiz
        </Link>
        <Link
          href={deckRoute(deck.id, "games")}
          className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#ecfdf5] px-5 text-[14px] font-black text-[#047857] transition hover:bg-[#d1fae5]"
        >
          Game
        </Link>
        <Link
          href={deckRoute(deck.id, "cards")}
          className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
        >
          View Cards
        </Link>
      </div>
    </article>
  );
}

function EmptyDecks({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid min-h-[430px] place-items-center rounded-[8px] border border-[#dbe7f5] bg-white px-6 text-center">
      <div className="max-w-[520px]">
        <h2 className="text-[28px] font-black text-[#0f172a]">
          No flashcard decks yet
        </h2>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-[#64748b]">
          Create flashcards from your uploaded documents to start studying.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onCreate}
            className="h-12 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
          >
            Create from Documents
          </button>
          <Link
            href="/library"
            className="inline-flex h-12 items-center justify-center rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
          >
            Go to Documents
          </Link>
        </div>
      </div>
    </div>
  );
}

function CreateDeckModal({
  documents,
  createStep,
  createBookId,
  createCount,
  createDifficulty,
  createLanguage,
  createType,
  createScope,
  createPreviewCards,
  createErrorMessage,
  isGenerating,
  onClose,
  onStepChange,
  onBookChange,
  onCountChange,
  onDifficultyChange,
  onLanguageChange,
  onTypeChange,
  onScopeChange,
  onGenerate,
}: {
  documents: LibraryDocument[];
  createStep: CreateStep;
  createBookId: string;
  createCount: number;
  createDifficulty: string;
  createLanguage: string;
  createType: string;
  createScope: string;
  createPreviewCards: StudyFlashcard[];
  createErrorMessage: string;
  isGenerating: boolean;
  onClose: () => void;
  onStepChange: (step: CreateStep) => void;
  onBookChange: (bookId: string) => void;
  onCountChange: (count: number) => void;
  onDifficultyChange: (difficulty: string) => void;
  onLanguageChange: (language: string) => void;
  onTypeChange: (type: string) => void;
  onScopeChange: (scope: string) => void;
  onGenerate: () => void;
}) {
  const readyDocuments = documents.filter((document) => document.status === "Ready");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/55 px-4 py-8">
      <div className="max-h-[90vh] w-[min(980px,100%)] overflow-y-auto rounded-[8px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2e8f0] px-6 py-5">
          <div>
            <p className="text-[14px] font-bold text-[#2563eb]">
              Create from Documents
            </p>
            <h2 className="mt-1 text-[28px] font-black text-[#0f172a]">
              Build a study deck
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-4 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
          >
            Close
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [1, "Document"],
              [2, "Generate"],
              [3, "Preview"],
            ].map(([step, label]) => (
              <div
                key={step}
                className={`rounded-[8px] px-4 py-3 ring-1 ${
                  createStep === step
                    ? "bg-[#eff6ff] text-[#1d4ed8] ring-[#bfdbfe]"
                    : "bg-[#f8fafc] text-[#64748b] ring-[#e2e8f0]"
                }`}
              >
                <p className="text-[13px] font-black">Step {step}</p>
                <p className="mt-1 text-[15px] font-bold">{label}</p>
              </div>
            ))}
          </div>

          {createErrorMessage ? (
            <div className="rounded-[8px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[14px] font-bold text-[#be123c]">
              {createErrorMessage}
            </div>
          ) : null}

          {createStep === 1 ? (
            <DocumentStep
              documents={documents}
              selectedBookId={createBookId}
              onBookChange={onBookChange}
            />
          ) : createStep === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <OptionGroup
                label="Number of cards"
                value={createCount.toString()}
                options={["10", "20", "30", "40"]}
                onChange={(value) => onCountChange(Number(value))}
              />
              <OptionGroup
                label="Difficulty"
                value={createDifficulty}
                options={["Easy", "Medium", "Hard"]}
                onChange={onDifficultyChange}
              />
              <OptionGroup
                label="Language"
                value={createLanguage}
                options={["English", "Vietnamese", "Bilingual"]}
                onChange={onLanguageChange}
              />
              <OptionGroup
                label="Question type"
                value={createType}
                options={["Definition", "Concept", "Comparison", "Example", "Mixed"]}
                onChange={onTypeChange}
              />
              <OptionGroup
                label="Content scope"
                value={createScope}
                options={["Whole document", "Key sections", "Weak topics"]}
                onChange={onScopeChange}
              />
              <div className="rounded-[8px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
                <p className="text-[14px] font-black text-[#0f172a]">
                  Quality guard
                </p>
                <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                  Flashcards are generated with Groq and filtered so vague
                  page-based questions do not enter the deck.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {createPreviewCards.length ? (
                createPreviewCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] p-4"
                  >
                    <p className="text-[12px] font-black text-[#2563eb]">
                      Card {index + 1}
                    </p>
                    <p className="mt-2 text-[16px] font-black text-[#0f172a]">
                      {card.question}
                    </p>
                    <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                      {card.answer}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[8px] bg-[#f8fafc] px-6 py-10 text-center ring-1 ring-[#e2e8f0]">
                  <h3 className="text-[22px] font-black text-[#0f172a]">
                    Ready to generate preview
                  </h3>
                  <p className="mt-2 text-[14px] font-semibold text-[#64748b]">
                    Review generated cards here before using the deck in Library.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-[#e2e8f0] pt-5">
            <button
              type="button"
              onClick={() =>
                createStep === 1
                  ? onClose()
                  : onStepChange(Math.max(1, createStep - 1) as CreateStep)
              }
              className="h-11 cursor-pointer rounded-[8px] border border-[#cbd5e1] bg-white px-5 text-[14px] font-black text-[#0f172a] transition hover:bg-[#f1f5f9]"
            >
              {createStep === 1 ? "Cancel" : "Back"}
            </button>
            {createStep === 1 ? (
              <button
                type="button"
                onClick={() => onStepChange(2)}
                disabled={!createBookId || !readyDocuments.length}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            ) : createStep === 2 ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Preview"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-11 cursor-pointer rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
              >
                Add to Library
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentStep({
  documents,
  selectedBookId,
  onBookChange,
}: {
  documents: LibraryDocument[];
  selectedBookId: string;
  onBookChange: (bookId: string) => void;
}) {
  if (!documents.length) {
    return (
      <div className="rounded-[8px] bg-[#f8fafc] px-6 py-10 text-center">
        <h3 className="text-[22px] font-black text-[#0f172a]">
          No documents available
        </h3>
        <p className="mt-2 text-[14px] font-semibold text-[#64748b]">
          Please upload a document in the Documents page first.
        </p>
        <Link
          href="/library"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white"
        >
          Go to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {documents.map((documentItem) => {
        const isReady = documentItem.status === "Ready";

        return (
          <button
            key={documentItem.id}
            type="button"
            disabled={!isReady}
            onClick={() => onBookChange(documentItem.id)}
            className={`grid cursor-pointer gap-3 rounded-[8px] px-4 py-4 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 md:grid-cols-[54px_minmax(0,1fr)_140px] ${
              selectedBookId === documentItem.id
                ? "bg-[#eff6ff] ring-[#2563eb]"
                : "bg-[#f8fafc] ring-[#e2e8f0] hover:bg-white"
            }`}
          >
            <Image
              src={DOCUMENT_ICON}
              alt=""
              width={52}
              height={52}
              className="h-13 w-13 rounded-[8px] object-cover"
            />
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-black text-[#0f172a]">
                {documentItem.title}
              </span>
              <span className="mt-1 block text-[13px] font-semibold text-[#64748b]">
                {documentItem.format} - {documentItem.chapters ?? 0} sections -{" "}
                {formatDate(documentItem.createdAt)}
              </span>
            </span>
            <span
              className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] font-black ${
                isReady
                  ? "bg-[#ecfdf5] text-[#047857]"
                  : "bg-[#fffbeb] text-[#b45309]"
              }`}
            >
              {isReady ? "Ready" : documentItem.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[8px] bg-[#f8fafc] p-4 ring-1 ring-[#e2e8f0]">
      <p className="text-[14px] font-black text-[#0f172a]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`h-10 cursor-pointer rounded-[8px] px-4 text-[13px] font-black transition ${
              value === option
                ? "bg-[#2563eb] text-white"
                : "bg-white text-[#475569] ring-1 ring-[#e2e8f0] hover:bg-[#eff6ff]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
