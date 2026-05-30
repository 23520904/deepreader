import Image from "next/image";
import type { LibraryDocument } from "@/types/library";

/**
 * Props for one document card in the library.
 * The parent component controls the document data and user actions.
 */
type LibraryCardProps = {
  // The document information displayed inside this card.
  document: LibraryDocument;

  // True while this document is being deleted.
  // Used to disable the delete button and show loading text.
  isDeleting: boolean;

  // Called when the user wants to open and read the document.
  onRead: (document: LibraryDocument) => void;

  // Called when the user wants to delete the document.
  onDelete: (document: LibraryDocument) => void;
};

/**
 * Return the correct badge style for each document status.
 * Ready, Failed, and processing statuses use different colors.
 */
function statusBadgeClass(status: LibraryDocument["status"]) {
  if (status === "Ready") {
    return "bg-[#d9f8df] text-[#2e9b55]";
  }

  if (status === "Failed") {
    return "bg-[#ff6470] text-white";
  }

  return "bg-[#fff0bd] text-[#ba8200]";
}

/**
 * Convert the createdAt value into a readable date.
 * If the date is missing or invalid, show a fallback text.
 */
function formatCreatedAt(value: string | null) {
  if (!value) {
    return "No date yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Return the label used for the document count.
 * PDF and EPUB use chapters, while other formats use sections.
 */
function countLabelFor(format: LibraryDocument["format"]) {
  if (format === "PDF" || format === "EPUB") {
    return "Chapters";
  }

  return "Sections";
}

export function LibraryCard({
  document,
  isDeleting,
  onRead,
  onDelete,
}: LibraryCardProps) {
  // The user can only read documents that are ready.
  const canRead = document.status === "Ready";

  return (
    <article className="group overflow-hidden rounded-[18px] bg-white shadow-[0_10px_24px_rgba(21,36,67,0.14)] ring-1 ring-[#dfe8f5] transition duration-300 hover:-translate-y-2 hover:shadow-[0_22px_42px_rgba(36,88,149,0.22)] hover:ring-[#b8cce5]">
      {/* Top visual area with format, status, image, title, and date */}
      <div className="relative min-h-[220px] overflow-hidden rounded-b-[16px] bg-[#e9f5ff] p-6">
        {/* Decorative background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(164,216,247,0.75),transparent_34%),linear-gradient(135deg,#edf3fb_0%,#d9ecfa_100%)]" />

        {/* Document format badge */}
        <div className="relative z-[1] inline-flex rounded-[999px] bg-white px-6 py-2 text-[14px] font-black text-[#245895] shadow-[0_8px_18px_rgba(36,88,149,0.10)]">
          {document.format}
        </div>

        {/* Document status badge */}
        <div
          className={`absolute right-5 top-6 z-[2] rounded-[999px] px-6 py-2 text-[14px] font-black shadow-[0_8px_18px_rgba(18,24,38,0.08)] ${statusBadgeClass(
            document.status,
          )}`}
        >
          {document.status}
        </div>

        {/* Decorative document image */}
        <Image
          src="/assets/images/library/document-3d.webp"
          alt=""
          width={180}
          height={180}
          className="absolute right-2 top-[70px] z-[1] h-[140px] w-[140px] object-contain drop-shadow-[0_22px_22px_rgba(36,88,149,0.18)] transition duration-300 group-hover:-translate-y-1 group-hover:rotate-[-4deg] group-hover:scale-105"
        />

        {/* Document title and created date */}
        <div className="relative z-[2] mt-[74px] max-w-[68%]">
          <h3 className="line-clamp-2 text-[30px] font-black leading-tight text-[#245895]">
            {document.title}
          </h3>

          <p className="mt-3 text-[17px] font-black text-[#7c879e]">
            {formatCreatedAt(document.createdAt)}
          </p>
        </div>
      </div>

      {/* Bottom information and action area */}
      <div className="p-6">
        {/* Chapter or section count */}
        <div className="flex justify-between border-b border-[#e3e9f2] pb-5 text-[22px] font-semibold text-[#7c879e]">
          <span>{countLabelFor(document.format)}</span>
          <span className="font-black text-[#17213a]">
            {document.chapters ?? "-"}
          </span>
        </div>

        {/* Document format detail */}
        <div className="flex justify-between border-b border-[#e3e9f2] py-5 text-[22px] font-semibold text-[#7c879e]">
          <span>Format</span>
          <span className="font-black text-[#17213a]">{document.format}</span>
        </div>

        {/* Read and delete actions */}
        <div className="mt-6 grid grid-cols-2 gap-5">
          <button
            type="button"
            onClick={() => onRead(document)}
            disabled={!canRead}
            className="h-[58px] cursor-pointer rounded-[8px] bg-[#235895] text-[16px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#e8edf5] disabled:text-[#7d8797]"
          >
            {canRead ? "Read" : document.status}
          </button>

          <button
            type="button"
            onClick={() => onDelete(document)}
            disabled={isDeleting}
            className="h-[58px] cursor-pointer rounded-[8px] bg-[#d92d3b] text-[16px] font-black text-white shadow-[0_8px_18px_rgba(217,45,59,0.26)] transition hover:bg-[#bd2432] disabled:cursor-not-allowed disabled:bg-[#e6a0a7] disabled:shadow-none"
            title={`${document.ownerName} - ${document.source}`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}