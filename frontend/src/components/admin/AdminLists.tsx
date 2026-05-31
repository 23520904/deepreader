"use client";

import { formatAdminDate } from "@/lib/admin";
import type {
  AdminDocumentRow,
  AdminUserRow,
} from "@/services/adminService";
import { AdminSkeleton, EmptyAdminState, TrashButton } from "./AdminShared";

/**
 * Account list for the admin accounts section.
 *
 * The card layout stacks on mobile and becomes a compact table-like grid on
 * medium screens and above.
 */
export function CompactUserList({
  users,
  isLoading,
  expanded = false,
  currentUserId = "",
  deletingUserId = "",
  onDeleteUser,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
  expanded?: boolean;
  currentUserId?: string;
  deletingUserId?: string;
  onDeleteUser?: (user: AdminUserRow) => void;
}) {
  const visibleUsers = expanded ? users : users.slice(0, 6);

  if (isLoading && !visibleUsers.length) {
    return <AdminSkeleton />;
  }

  if (!visibleUsers.length) {
    return <EmptyAdminState text="No users found." />;
  }

  return (
    <div className="grid min-w-0 gap-3">
      {visibleUsers.map((user) => (
        <div
          key={user.user_id}
          className={[
            "grid min-w-0 gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:bg-slate-50",
            "sm:px-5",
            onDeleteUser
              ? "md:grid-cols-[minmax(0,1fr)_minmax(0,230px)_44px] md:items-center"
              : "md:grid-cols-[minmax(0,1fr)_minmax(0,230px)] md:items-center",
          ].join(" ")}
        >
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-[15px] font-semibold text-slate-950">
              {user.username || user.email}
            </p>

            <p className="mt-0.5 break-all text-[13px] font-medium leading-5 text-slate-500">
              {user.email}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2 md:justify-end">
            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              <span className="truncate">{user.role}</span>
            </span>

            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              <span className="truncate">{user.document_count} docs</span>
            </span>
          </div>

          {onDeleteUser ? (
            <div className="flex shrink-0 justify-end">
              <TrashButton
                label={`Delete ${user.username || user.email}`}
                disabled={
                  user.user_id === currentUserId ||
                  deletingUserId === user.user_id
                }
                isBusy={deletingUserId === user.user_id}
                onClick={() => onDeleteUser(user)}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Document list for the admin documents section.
 *
 * Uses one column on small screens, two columns on larger screens, and keeps
 * delete buttons aligned to the top-right of each document card.
 */
export function CompactDocumentList({
  documents,
  isLoading,
  expanded = false,
  deletingDocumentId = "",
  onDeleteDocument,
}: {
  documents: AdminDocumentRow[];
  isLoading: boolean;
  expanded?: boolean;
  deletingDocumentId?: string;
  onDeleteDocument?: (document: AdminDocumentRow) => void;
}) {
  const visibleDocuments = expanded ? documents : documents.slice(0, 6);

  if (isLoading && !visibleDocuments.length) {
    return <AdminSkeleton />;
  }

  if (!visibleDocuments.length) {
    return <EmptyAdminState text="No indexed documents found." />;
  }

  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
      {visibleDocuments.map((document) => (
        <div
          key={document.document_id}
          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:bg-slate-50 sm:px-5"
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="min-w-0 overflow-hidden">
              <p className="line-clamp-2 break-words text-[15px] font-semibold leading-6 text-slate-950 [overflow-wrap:anywhere]">
                {document.file_name}
              </p>

              <p className="mt-2 break-words text-[13px] font-medium leading-5 text-slate-500 [overflow-wrap:anywhere]">
                Owner: {document.username || document.email || "Unknown"}
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                {formatAdminDate(document.created_at)}
              </p>
            </div>

            {onDeleteDocument ? (
              <div className="shrink-0">
                <TrashButton
                  label={`Delete ${document.file_name}`}
                  disabled={deletingDocumentId === document.document_id}
                  isBusy={deletingDocumentId === document.document_id}
                  onClick={() => onDeleteDocument(document)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}