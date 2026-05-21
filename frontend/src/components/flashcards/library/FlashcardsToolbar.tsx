import type { DeckSortMode, StatusFilter, StudyDeck } from "@/lib/flashcardStudy";
import type {
  FlashcardsToolbarActions,
  FlashcardsToolbarState,
} from "@/components/flashcards/library/types";

type FlashcardsToolbarProps = FlashcardsToolbarState &
  FlashcardsToolbarActions & {
    decks: StudyDeck[];
  };

export function FlashcardsToolbar({
  decks,
  query,
  documentFilter,
  statusFilter,
  sortMode,
  onQueryChange,
  onDocumentFilterChange,
  onStatusFilterChange,
  onSortModeChange,
}: FlashcardsToolbarProps) {
  return (
    <div className="rounded-[16px] border border-[#dbe7f5] bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <div className="hidden gap-3 md:grid md:grid-cols-[minmax(260px,1fr)_220px_170px_160px]">
        <label className="sr-only" htmlFor="flashcard-search">
          Search decks or cards
        </label>
        <input
          id="flashcard-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search decks or cards..."
          className="h-11 rounded-[10px] border border-[#dbe7f5] bg-[#f8fbff] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:bg-white"
        />

        <DocumentSelect
          decks={decks}
          value={documentFilter}
          onChange={onDocumentFilterChange}
        />
        <StatusSelect value={statusFilter} onChange={onStatusFilterChange} />
        <SortSelect value={sortMode} onChange={onSortModeChange} />
      </div>

      <div className="grid gap-3 md:hidden">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search decks or cards..."
          className="h-11 rounded-[10px] border border-[#dbe7f5] bg-[#f8fbff] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:bg-white"
          aria-label="Search decks or cards"
        />
        <details className="rounded-[10px] border border-[#dbe7f5] bg-[#f8fbff] px-4 py-3">
          <summary className="cursor-pointer text-[14px] font-black text-[#1d4ed8]">
            Filter
          </summary>
          <div className="mt-3 grid gap-3">
            <DocumentSelect
              decks={decks}
              value={documentFilter}
              onChange={onDocumentFilterChange}
              mobile
            />
            <StatusSelect
              value={statusFilter}
              onChange={onStatusFilterChange}
              mobile
            />
            <SortSelect value={sortMode} onChange={onSortModeChange} mobile />
          </div>
        </details>
      </div>
    </div>
  );
}

function DocumentSelect({
  decks,
  value,
  onChange,
  mobile = false,
}: {
  decks: StudyDeck[];
  value: string;
  onChange: (documentId: string) => void;
  mobile?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Filter by document"
      className={selectClassName(mobile)}
    >
      <option value="all">All documents</option>
      {decks.map((deck) => (
        <option key={deck.id} value={deck.id}>
          {deck.title}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({
  value,
  onChange,
  mobile = false,
}: {
  value: StatusFilter;
  onChange: (status: StatusFilter) => void;
  mobile?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as StatusFilter)}
      aria-label="Filter by status"
      className={selectClassName(mobile)}
    >
      <option value="all">All status</option>
      <option value="learning">In progress</option>
      <option value="new">New</option>
      <option value="mastered">Completed</option>
    </select>
  );
}

function SortSelect({
  value,
  onChange,
  mobile = false,
}: {
  value: DeckSortMode;
  onChange: (sortMode: DeckSortMode) => void;
  mobile?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DeckSortMode)}
      aria-label="Sort decks"
      className={selectClassName(mobile)}
    >
      <option value="newest">Newest</option>
      <option value="last-studied">Last studied</option>
      <option value="most-cards">Most cards</option>
    </select>
  );
}

function selectClassName(mobile: boolean) {
  return mobile
    ? "h-11 rounded-[10px] border border-[#dbe7f5] bg-white px-4 text-[14px] font-bold text-[#0f172a] outline-none"
    : "h-11 rounded-[10px] border border-[#dbe7f5] bg-[#f8fbff] px-4 text-[14px] font-bold text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:bg-white";
}
