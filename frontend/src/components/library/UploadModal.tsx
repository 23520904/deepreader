import Image from "next/image";
import type { ChangeEvent, DragEvent, RefObject } from "react";

type UploadModalProps = {
  isOpen: boolean;
  isUploading: boolean;
  isUploadBlocked: boolean;
  isDragging: boolean;
  stagedFile: File | null;
  provider: string;
  uploadMessage: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onProviderChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onPreviewFile: () => void;
  onRemoveFile: () => void;
  onSubmit: () => void;
};

function UploadIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 15.5V4.75m0 0 4.35 4.35M12 4.75 7.65 9.1M5 15.75v2A2.25 2.25 0 0 0 7.25 20h9.5A2.25 2.25 0 0 0 19 17.75v-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-9 w-9" viewBox="0 0 24 24">
      <path
        d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.75 12s3.35-6 9.25-6 9.25 6 9.25 6-3.35 6-9.25 6-9.25-6-9.25-6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <Image
      src="/assets/images/library/trash-icon.png"
      alt=""
      width={28}
      height={28}
      className="h-7 w-7 object-contain"
    />
  );
}

function FileGlyph({ format }: { format: "PDF" | "EPUB" }) {
  if (format !== "EPUB") {
    return (
      <Image
        src="/assets/images/library/pdf-icon.png"
        alt="PDF file"
        width={78}
        height={78}
        className="h-[78px] w-[78px] object-contain drop-shadow-[0_8px_10px_rgba(23,33,58,0.20)]"
      />
    );
  }

  return (
    <div className="relative grid h-[78px] w-[64px] place-items-end rounded-[14px] bg-white pb-3 shadow-[0_8px_12px_rgba(23,33,58,0.20)]">
      <div className="absolute right-0 top-0 h-0 w-0 border-l-[18px] border-t-[18px] border-l-[#cfd4df] border-t-[#eef1f8]" />

      <span className="rounded-[4px] bg-[#5ca737] px-2 py-1 text-[16px] font-black text-white">
        EPUB
      </span>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadModal({
  isOpen,
  isUploading,
  isUploadBlocked,
  isDragging,
  stagedFile,
  provider,
  uploadMessage,
  fileInputRef,
  onClose,
  onProviderChange,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onPreviewFile,
  onRemoveFile,
  onSubmit,
}: UploadModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#121826]/45 px-4 py-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-[min(960px,100%)] overflow-y-auto rounded-[10px] bg-white shadow-[0_26px_80px_rgba(18,24,38,0.32)]">
        <div className="flex items-start justify-between gap-6 px-8 py-7">
          <div>
            <h2 className="text-[26px] font-black tracking-[0] text-black">
              Add new documents to the Library
            </h2>

            <p className="mt-3 text-[16px] font-medium text-[#8e929d]">
              Choose PDF or EPUB file format and provider if needed.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-black transition hover:scale-105"
            aria-label="Close upload dialog"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="border-t border-[#d8dbe3]" />

        <div className="px-8 py-7">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              onDragOver();
            }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`grid min-h-[250px] cursor-pointer place-items-center rounded-[14px] border-2 border-dashed px-6 text-center transition ${
              isDragging
                ? "border-[#245895] bg-[#f3f7ff]"
                : "border-[#7f838d] bg-white"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              onChange={onFileChange}
              className="sr-only"
            />

            <div>
              <div className="relative mx-auto h-[86px] w-[86px]">
                <div className="absolute left-1 top-0 h-[74px] w-[58px] rounded-[7px] bg-[#989ba3]">
                  <div className="absolute right-0 top-0 h-0 w-0 border-l-[24px] border-t-[24px] border-l-[#787b82] border-t-white" />
                </div>

                <div className="absolute bottom-0 right-0 grid h-[52px] w-[52px] place-items-center rounded-full bg-[#245895] text-white">
                  <UploadIcon className="h-8 w-8" />
                </div>
              </div>

              <p className="mt-6 text-[18px] font-medium text-black">
                Drag and Drop file here or{" "}
                <span className="border-b-2 border-[#245895] font-black text-[#245895]">
                  Choose file
                </span>
              </p>
            </div>
          </label>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
            <p className="text-[16px] font-medium text-[#8f939e]">
              Supported formats: PDF and EPUB
            </p>

            <label className="flex items-center gap-3 text-[15px] font-black text-[#17213a]">
              Provider

              <select
                value={provider}
                onChange={(event) => onProviderChange(event.target.value)}
                className="h-10 rounded-[6px] border border-[#d7dbe5] bg-white px-4 text-[15px] font-black outline-none"
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
          </div>

          {uploadMessage ? (
            <div className="mt-5 rounded-[8px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-3 text-[14px] font-bold text-[#b42335]">
              {uploadMessage}
            </div>
          ) : null}

          <div className="mt-7 rounded-[14px] bg-[#e8eaf3] px-7 py-6">
            {stagedFile ? (
              <div className="flex flex-wrap items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <FileGlyph
                    format={
                      stagedFile.name.toLowerCase().endsWith(".epub")
                        ? "EPUB"
                        : "PDF"
                    }
                  />

                  <div>
                    <p className="text-[18px] font-black text-black">
                      {stagedFile.name}
                    </p>

                    <p className="mt-2 text-[16px] font-medium text-[#8d929c]">
                      {formatFileSize(stagedFile.size)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <button
                    type="button"
                    onClick={onPreviewFile}
                    className="grid h-[56px] w-[56px] cursor-pointer place-items-center rounded-full bg-white text-black shadow-[0_6px_10px_rgba(20,24,34,0.22)] transition hover:scale-105"
                    aria-label="Preview selected file"
                  >
                    <EyeIcon />
                  </button>

                  <button
                    type="button"
                    onClick={onRemoveFile}
                    className="grid h-[56px] w-[56px] cursor-pointer place-items-center rounded-full bg-white text-black shadow-[0_6px_10px_rgba(20,24,34,0.22)] transition hover:scale-105"
                    aria-label="Remove selected file"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[18px] font-medium text-[#8d929c]">
                No file selected
              </p>
            )}
          </div>

          <div className="mt-7 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#e6e8f1] px-7 text-[15px] font-black text-black transition hover:bg-[#dfe2eb]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isUploadBlocked}
              className="h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#245895] px-7 text-[15px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8ca5c7]"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}