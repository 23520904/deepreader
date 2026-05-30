import Image from "next/image";

/**
 * Props for the delete confirmation dialog.
 * The parent component controls the document title, loading state,
 * and what happens when the user cancels or confirms.
 */
type DeleteConfirmDialogProps = {
  // The title of the document that will be deleted.
  documentTitle: string;

  // True while the delete request is running.
  // This prevents the user from clicking buttons multiple times.
  isDeleting: boolean;

  // Called when the user closes the dialog without deleting.
  onCancel: () => void;

  // Called when the user confirms the delete action.
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  documentTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  // Do not render the dialog if there is no document selected.
  if (!documentTitle) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121826]/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-document-title"
    >
      {/* Dialog card */}
      <div className="w-[min(460px,100%)] rounded-[12px] bg-white p-7 shadow-[0_26px_70px_rgba(18,24,38,0.32)]">
        {/* Warning icon */}
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fff0f1] text-[#d92d3b]">
          <Image
            src="/assets/images/library/trash-icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
        </div>

        {/* Dialog title */}
        <h2
          id="delete-document-title"
          className="mt-5 text-center text-[24px] font-black text-[#121826]"
        >
          Delete this document?
        </h2>

        {/* Message showing which document will be removed */}
        <p className="mt-3 text-center text-[15px] font-semibold leading-7 text-[#7b8496]">
          This will remove{" "}
          <span className="font-black text-[#121826]">
            &quot;{documentTitle}&quot;
          </span>{" "}
          from your library.
        </p>

        {/* Action buttons */}
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-12 cursor-pointer rounded-[7px] bg-[#e8ebf4] text-[15px] font-black text-[#121826] transition hover:bg-[#dfe4ef] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-12 cursor-pointer rounded-[7px] bg-[#d92d3b] text-[15px] font-black text-white shadow-[0_8px_18px_rgba(217,45,59,0.26)] transition hover:bg-[#bd2432] disabled:cursor-not-allowed disabled:bg-[#e6a0a7] disabled:shadow-none"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}