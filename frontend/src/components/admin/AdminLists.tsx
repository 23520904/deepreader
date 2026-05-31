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
    <div className="grid gap-3">
      {visibleUsers.map((user) => (
        <div
          key={user.user_id}
          className={`grid gap-3 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 ${
            onDeleteUser
              ? "md:grid-cols-[minmax(0,1fr)_110px_100px_46px] md:items-center"
              : "md:grid-cols-[minmax(0,1fr)_110px_100px] md:items-center"
          }`}
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black text-[#0f172a]">
              {user.username || user.email}
            </p>
            <p className="truncate text-[13px] font-semibold text-[#64748b]">
              {user.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:contents">
            <span className="h-fit rounded-full bg-white px-3 py-1 text-center text-[12px] font-black text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
              {user.role}
            </span>

            <span className="h-fit rounded-full bg-white px-3 py-1 text-center text-[12px] font-black text-[#64748b] ring-1 ring-[#e2e8f0]">
              {user.document_count} docs
            </span>
          </div>

          {onDeleteUser ? (
            <div className="flex justify-end md:block">
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
    <div className="grid gap-3 lg:grid-cols-2">
      {visibleDocuments.map((document) => (
        <div
          key={document.document_id}
          className="grid min-w-0 gap-3 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] font-black leading-6 text-[#0f172a]">
                {document.file_name}
              </p>
              <p className="mt-2 truncate text-[13px] font-semibold text-[#64748b]">
                Owner: {document.username || document.email || "Unknown"}
              </p>
              <p className="mt-1 text-[12px] font-bold text-[#94a3b8]">
                {formatAdminDate(document.created_at)}
              </p>
            </div>

            {onDeleteDocument ? (
              <TrashButton
                label={`Delete ${document.file_name}`}
                disabled={deletingDocumentId === document.document_id}
                isBusy={deletingDocumentId === document.document_id}
                onClick={() => onDeleteDocument(document)}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}