"use client";

/* eslint-disable @next/next/no-img-element */
import type { DeleteDialog, Notice } from "@/types/admin";

/**
 * Confirmation modal used before destructive admin actions.
 */
export function AdminDeleteDialog({
  dialog,
  isBusy,
  onCancel,
  onConfirm,
}: {
  dialog: DeleteDialog;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!dialog) {
    return null;
  }

  const isUser = dialog.kind === "user";
  const title = isUser ? "Delete user?" : "Delete document?";
  const name = isUser
    ? dialog.user.username || dialog.user.email
    : dialog.document.file_name;
  const message = isUser
    ? "This will remove the account and the data owned by this user. This action cannot be undone."
    : "This will remove the indexed document from the system. This action cannot be undone.";

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-[#0f172a]/38 px-3 py-3 backdrop-blur-sm sm:place-items-center sm:px-4">
      <section className="w-full max-w-[460px] rounded-[20px] border border-[#fecdd3] bg-white p-4 shadow-[0_26px_70px_rgba(15,23,42,0.22)] sm:p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#fff1f2] ring-1 ring-[#fecdd3]">
            <img
              src="/assets/icons/admin/trash-icon.png"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-[21px] font-black text-[#0f172a] sm:text-[22px]">
              {title}
            </h2>
            <p className="mt-2 break-words text-[14px] font-black text-[#be123c]">
              {name}
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="h-11 cursor-pointer rounded-[12px] bg-[#f8fafc] text-[14px] font-black text-[#0f172a] ring-1 ring-[#dbe7f5] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="h-11 cursor-pointer rounded-[12px] bg-[#e11d48] text-[14px] font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.2)] transition hover:bg-[#be123c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * Floating toast notification for admin success and error feedback.
 */
export function AdminNotice({
  notice,
  onClose,
}: {
  notice: Notice;
  onClose: () => void;
}) {
  if (!notice) {
    return null;
  }

  const tone =
    notice.type === "success"
      ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#047857]"
      : "border-[#fecdd3] bg-[#fff1f2] text-[#be123c]";

  return (
    <div className="fixed inset-x-3 bottom-4 z-[80] sm:inset-x-auto sm:right-5 sm:w-[min(360px,calc(100vw_-_32px))]">
      <div
        className={`rounded-[16px] border px-4 py-3 shadow-[0_18px_46px_rgba(15,23,42,0.16)] ${tone}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-black">{notice.title}</p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-[#475569]">
              {notice.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full bg-white/70 text-[16px] font-black text-[#64748b] ring-1 ring-black/5"
            aria-label="Close notification"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}