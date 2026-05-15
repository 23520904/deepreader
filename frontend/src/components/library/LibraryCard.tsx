type DocumentSource = "mine";

type LibraryDocument = {
  id: string;
  title: string;
  format: "PDF" | "EPUB" | "UNKNOWN";
  status: "Ready" | "Processing" | "Failed";
  chapters: number | null;
  source: DocumentSource;
  ownerName: string;
  createdAt: string | null;
};

type LibraryCardProps = {
  document: LibraryDocument;
};

function statusBadgeClass(status: LibraryDocument["status"]) {
  if (status === "Ready") {
    return "bg-[#d9f8df] text-[#2e9b55]";
  }

  if (status === "Failed") {
    return "bg-[#ff5c6a] text-[#b92838]";
  }

  return "bg-[#fff0bd] text-[#ba8200]";
}

export function LibraryCard({ document }: LibraryCardProps) {
  return (
    <article className="overflow-hidden rounded-[16px] bg-white shadow-[0_4px_16px_rgba(21,24,34,0.18)]">
      <div className="relative flex h-[154px] flex-col justify-end rounded-b-[14px] bg-[#e5e8f1] p-5">
        <div className="absolute left-4 top-4 rounded-[999px] bg-white px-6 py-2 text-[14px] font-black text-[#245895]">
          {document.format}
        </div>

        <div
          className={`absolute right-3 top-4 rounded-[999px] px-6 py-2 text-[14px] font-black ${statusBadgeClass(
            document.status,
          )}`}
        >
          {document.status}
        </div>

        <h3 className="line-clamp-2 text-[24px] font-black leading-tight text-[#245895]">
          {document.title}
        </h3>
      </div>

      <div className="p-5">
        <div className="flex justify-between border-b border-black/60 pb-3 text-[15px] font-semibold text-[#222]">
          <span>Chapters</span>
          <span className="font-black">{document.chapters ?? 9}</span>
        </div>

        <div className="flex justify-between pt-4 text-[15px] font-semibold text-[#222]">
          <span>Format</span>
          <span className="font-black">{document.format}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-5">
          <button
            type="button"
            className="h-[45px] cursor-pointer rounded-[5px] bg-[#235895] text-[14px] font-black text-white transition hover:bg-[#1d4d86]"
          >
            Read
          </button>

          <button
            type="button"
            className="h-[45px] cursor-pointer rounded-[5px] bg-white text-[14px] font-black text-[#245895] shadow-[0_3px_10px_rgba(21,24,34,0.20)] transition hover:bg-[#f6f8fc]"
            title={`${document.ownerName} - ${document.source}`}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}