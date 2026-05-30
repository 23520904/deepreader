import Image from "next/image";
import Lottie from "lottie-react";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import uploadLoadingAnimation from "@/assets/animations/upload-loading.json";

type UploadModalProps = {
  // Controls whether the modal is shown or hidden.
  isOpen: boolean;

  // True while the file is being uploaded.
  isUploading: boolean;

  // True when the user cannot upload yet, for example when no file is selected.
  isUploadBlocked: boolean;

  // True when the upload process has finished successfully.
  isUploadComplete: boolean;

  // Current upload percentage from 0 to 100.
  uploadProgress: number;

  // Text that shows the estimated remaining upload time.
  uploadEtaLabel: string;

  // True when the user is dragging a file over the upload area.
  isDragging: boolean;

  // The file selected by the user before uploading.
  stagedFile: File | null;

  // Message shown to the user, usually for errors or success feedback.
  uploadMessage: string;

  // Ref used to access the hidden file input element.
  fileInputRef: RefObject<HTMLInputElement | null>;

  // Closes the upload modal.
  onClose: () => void;

  // Runs when the user selects a file from the file picker.
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;

  // Runs when a file is dragged over the upload area.
  onDragOver: () => void;

  // Runs when the dragged file leaves the upload area.
  onDragLeave: () => void;

  // Runs when the user drops a file into the upload area.
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;

  // Opens a preview of the selected file.
  onPreviewFile: () => void;

  // Removes the currently selected file.
  onRemoveFile: () => void;

  // Starts the upload process.
  onSubmit: () => void;
};

// Small upload icon used inside the drag-and-drop area.
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

// Close icon used by the modal close button.
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

// Eye icon used for the preview file button.
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

// Trash icon image used for the remove file button.
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

// Shows a different file icon depending on the selected file format.
function FileGlyph({ format }: { format: "PDF" | "EPUB" }) {
  // PDF files use an image icon.
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

  // EPUB files use a custom card-like icon made with HTML and Tailwind.
  return (
    <div className="relative grid h-[78px] w-[64px] place-items-end rounded-[14px] bg-white pb-3 shadow-[0_8px_12px_rgba(23,33,58,0.20)]">
      <div className="absolute right-0 top-0 h-0 w-0 border-l-[18px] border-t-[18px] border-l-[#cfd4df] border-t-[#eef1f8]" />

      <span className="rounded-[4px] bg-[#5ca737] px-2 py-1 text-[16px] font-black text-white">
        EPUB
      </span>
    </div>
  );
}

// Converts a file size in bytes into a simple KB or MB label.
function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

// Upload modal used to select, preview, remove, and upload PDF or EPUB files.
export function UploadModal({
  isOpen,
  isUploading,
  isUploadBlocked,
  isUploadComplete,
  uploadProgress,
  uploadEtaLabel,
  isDragging,
  stagedFile,
  uploadMessage,
  fileInputRef,
  onClose,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onPreviewFile,
  onRemoveFile,
  onSubmit,
}: UploadModalProps) {
  // Do not render anything when the modal is closed.
  if (!isOpen) {
    return null;
  }

  // Keeps the progress value safe so the progress bar always stays between 0% and 100%.
  const safeUploadProgress = Math.min(
    100,
    Math.max(0, Math.round(uploadProgress)),
  );

  // The main button is disabled when upload is blocked, but it is enabled again after upload is complete.
  const primaryButtonDisabled = isUploadComplete ? false : isUploadBlocked;

  // Changes the message style based on whether the upload is complete or not.
  const uploadMessageClasses = isUploadComplete
    ? "border-[#9bdcac] bg-[#effcf3] text-[#1d7b45]"
    : "border-[#ffc4ca] bg-[#fff0f1] text-[#b42335]";

  // Status view is used while uploading or after the upload has completed.
  const isStatusView = isUploading || isUploadComplete;

  // The modal is narrower for the upload status screen and wider for the file selection screen.
  const modalWidthClass = isStatusView
    ? "w-[min(640px,100%)]"
    : "w-[min(960px,100%)]";

  // Title changes depending on the current upload state.
  const modalTitle = isStatusView
    ? isUploadComplete
      ? "Upload complete"
      : safeUploadProgress >= 100
        ? "Processing document"
        : "Uploading document"
    : "Add new documents to the Library";

  // Description gives the user a clear explanation of what is happening.
  const modalDescription = isStatusView
    ? isUploadComplete
      ? "Your document has been added to the library."
      : safeUploadProgress >= 100
        ? "Your file was uploaded. DeepReader is extracting and indexing it now."
        : "Please wait while DeepReader uploads your file."
    : "Choose a PDF or EPUB file to add to your library.";

  return (
    // Main modal overlay that darkens the background.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#121826]/45 px-4 py-5"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal container */}
      <div
        className={`max-h-[92vh] ${modalWidthClass} overflow-y-auto rounded-[10px] bg-white shadow-[0_26px_80px_rgba(18,24,38,0.32)]`}
      >
        {/* Modal header with title, description, and close button */}
        <div className="flex items-start justify-between gap-6 px-8 py-7">
          <div>
            <h2 className="text-[26px] font-black tracking-[0] text-black">
              {modalTitle}
            </h2>

            <p className="mt-3 text-[16px] font-medium text-[#8e929d]">
              {modalDescription}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="cursor-pointer text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Close upload dialog"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="border-t border-[#d8dbe3]" />

        {/* Main modal content */}
        <div className="px-8 py-7">
          {isStatusView ? (
            // Upload status screen with animation, progress bar, and completion message.
            <div className="grid min-h-[360px] place-items-center text-center">
              <div className="w-full">
                {/* Upload animation */}
                <div className="mx-auto h-[190px] w-[190px]">
                  <Lottie
                    animationData={uploadLoadingAnimation}
                    autoplay
                    loop={isUploading}
                    className="h-full w-full"
                  />
                </div>

                {/* Upload progress information */}
                <div className="mx-auto mt-5 max-w-[500px]">
                  <div className="flex items-center justify-between gap-4 text-left text-[14px] font-black text-[#245895]">
                    <span>
                      {isUploadComplete
                        ? "Upload completed successfully."
                        : safeUploadProgress >= 100
                          ? "Processing document..."
                          : "Uploading file..."}
                    </span>

                    <span>{safeUploadProgress}%</span>
                  </div>

                  <div className="mt-3 h-4 overflow-hidden rounded-full bg-[#dfe7f4]">
                    <div
                      className="h-full rounded-full bg-[#245895] transition-[width] duration-300 ease-out"
                      style={{ width: `${safeUploadProgress}%` }}
                    />
                  </div>

                  {/* Optional estimated time label */}
                  {uploadEtaLabel ? (
                    <p className="mt-3 text-left text-[13px] font-bold text-[#7f8da5]">
                      {uploadEtaLabel}
                    </p>
                  ) : null}
                </div>

                {/* Optional upload message, such as success or error text */}
                {uploadMessage ? (
                  <div
                    className={`mx-auto mt-5 max-w-[500px] rounded-[8px] border px-5 py-3 text-[14px] font-bold ${uploadMessageClasses}`}
                  >
                    {uploadMessage}
                  </div>
                ) : null}

                {/* Final action shown only after upload is complete */}
                {isUploadComplete ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-7 h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#245895] px-7 text-[15px] font-black text-white transition hover:bg-[#1d4d86]"
                  >
                    Done
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
          {/* Drag-and-drop area and hidden file input */}
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
              disabled={isUploading}
              className="sr-only"
            />

            <div>
              {/* Large visual upload icon */}
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

          {/* Supported file format note */}
          <div className="mt-5">
            <p className="text-[16px] font-medium text-[#8f939e]">
              Supported formats: PDF and EPUB
            </p>
          </div>

          {/* Optional upload message shown on the file selection screen */}
          {uploadMessage ? (
            <div
              className={`mt-5 rounded-[8px] border px-5 py-3 text-[14px] font-bold ${uploadMessageClasses}`}
            >
              {uploadMessage}
            </div>
          ) : null}

          {/* Selected file preview area */}
          <div className="mt-7 rounded-[14px] bg-[#e8eaf3] px-7 py-6">
            {stagedFile ? (
              <div className="flex flex-wrap items-center justify-between gap-8">
                {/* Selected file icon, name, and size */}
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

                {/* File action buttons */}
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
                    disabled={isUploading}
                    className="grid h-[56px] w-[56px] cursor-pointer place-items-center rounded-full bg-white text-black shadow-[0_6px_10px_rgba(20,24,34,0.22)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Remove selected file"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ) : isUploadComplete ? (
              <p className="text-[18px] font-black text-[#1d7b45]">
                Your document is ready in the library.
              </p>
            ) : (
              <p className="text-[18px] font-medium text-[#8d929c]">
                No file selected
              </p>
            )}
          </div>

          {/* Footer action buttons */}
          <div className="mt-7 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#e6e8f1] px-7 text-[15px] font-black text-black transition hover:bg-[#dfe2eb] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isUploadComplete ? "Close" : "Cancel"}
            </button>

            <button
              type="button"
              onClick={isUploadComplete ? onClose : onSubmit}
              disabled={primaryButtonDisabled}
              className="h-[48px] min-w-[138px] cursor-pointer rounded-[7px] bg-[#245895] px-7 text-[15px] font-black text-white transition hover:bg-[#1d4d86] disabled:cursor-not-allowed disabled:bg-[#8ca5c7]"
            >
              {isUploadComplete ? "Done" : isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}