import Image from "next/image";
import { STACK_ICON } from "@/lib/flashcardStudy";

type FlashcardsHeaderProps = {
  summaryLine: string;
  onCreate: () => void;
};

export function FlashcardsHeader({
  summaryLine,
  onCreate,
}: FlashcardsHeaderProps) {
  return (
    <div className="rounded-[18px] border border-[#dbe7f5] bg-white px-6 py-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-[clamp(34px,4vw,48px)] font-black leading-tight text-[#0f172a]">
            Flashcards
          </h1>
          <p className="mt-2 max-w-[620px] text-[16px] font-semibold leading-7 text-[#64748b]">
            Review and practice flashcards generated from your documents.
          </p>
          <p className="mt-3 text-[14px] font-black text-[#2563eb]">
            {summaryLine}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-3 rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8]"
        >
          <Image src={STACK_ICON} alt="" width={22} height={22} />
          Generate flashcards
        </button>
      </div>
    </div>
  );
}
