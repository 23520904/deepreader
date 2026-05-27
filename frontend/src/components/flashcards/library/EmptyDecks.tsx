import Image from "next/image";
import { STACK_ICON } from "@/lib/flashcardStudy";

type EmptyDecksProps = {
  onCreate: () => void;
};

export function EmptyDecks({ onCreate }: EmptyDecksProps) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-[18px] border border-[#dbe7f5] bg-white px-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="max-w-[520px]">
        <h2 className="text-[28px] font-black text-[#0f172a]">
          No flashcard decks yet
        </h2>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-[#64748b]">
          Generate flashcards from your uploaded documents to start studying.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-11 cursor-pointer items-center justify-center gap-3 rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
          >
            <Image src={STACK_ICON} alt="" width={20} height={20} />
            Generate flashcards
          </button>
        </div>
      </div>
    </div>
  );
}
