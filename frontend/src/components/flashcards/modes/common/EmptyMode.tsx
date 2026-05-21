import Link from "next/link";
export function EmptyMode({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-[8px] border border-[#dbe7f5] bg-white text-center">
      <div className="max-w-[480px] px-5">
        <h1 className="text-[28px] font-black text-[#0f172a]">{title}</h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-[#64748b]">
          {description}
        </p>
        <Link
          href="/flashcards"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#2563eb] px-5 text-[14px] font-black text-white transition hover:bg-[#1d4ed8]"
        >
          Back to decks
        </Link>
      </div>
    </div>
  );
}
