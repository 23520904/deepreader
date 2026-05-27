import { ModeHeader } from "../common/ModeHeader";
import {
  cardStatus,
  statusClasses,
  statusLabel,
  truncateText,
  type CardProgress,
  type StudyDeck,
  type StudyFlashcard,
} from "@/lib/flashcardStudy";
export function CardsView({
  deck,
  studyProgress,
  onViewCard,
  onEditCard,
  onDeleteCard,
}: {
  deck: StudyDeck;
  studyProgress: Record<string, CardProgress>;
  onViewCard: (card: StudyFlashcard) => void;
  onEditCard: (card: StudyFlashcard) => void;
  onDeleteCard: (cardId: string) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[8px] border border-[#dbe7f5] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] max-[520px]:p-4">
      <ModeHeader deck={deck} label="Cards" title="Cards in this deck" />
      <div className="mt-5 overflow-hidden rounded-[8px] border border-[#e2e8f0]">
        {deck.cards.map((card) => {
          const status = cardStatus(card.id, studyProgress);

          return (
            <div
              key={card.id}
              className="grid min-w-0 gap-3 border-b border-[#e2e8f0] px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_180px] max-[520px]:px-3"
            >
              <button
                type="button"
                onClick={() => onViewCard(card)}
                className="min-w-0 cursor-pointer text-left"
              >
                <span className="line-clamp-2 text-[15px] font-black leading-6 text-[#0f172a]">
                  {card.question}
                </span>
              </button>
              <p className="line-clamp-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                {truncateText(card.answer, 150)}
              </p>
              <span
                className={`h-fit w-fit rounded-full px-3 py-1 text-[12px] font-black ring-1 ${statusClasses(status)}`}
              >
                {statusLabel(status)}
              </span>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:justify-end">
                <button
                  type="button"
                  onClick={() => onEditCard(card)}
                  className="h-9 cursor-pointer rounded-[8px] bg-[#f8fafc] px-3 text-[13px] font-black text-[#0f172a] ring-1 ring-[#e2e8f0] transition hover:bg-[#eff6ff]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCard(card.id)}
                  className="h-9 cursor-pointer rounded-[8px] bg-[#fff1f2] px-3 text-[13px] font-black text-[#be123c] transition hover:bg-[#ffe4e6]"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
