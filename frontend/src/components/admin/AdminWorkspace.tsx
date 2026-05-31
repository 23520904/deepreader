"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  clearAuthSession,
  getAuthSessionSnapshot,
  subscribeAuthSession,
} from "@/lib/authSession";
import {
  applyAdminBundle,
  emptyAdminSummary,
  fetchAdminBundle,
} from "@/lib/admin";
import {
  deleteAdminDocument,
  deleteAdminUser,
  type AdminAuditLog,
  type AdminDocumentRow,
  type AdminSummary,
  type AdminUserRow,
} from "@/services/adminService";
import type { AdminSection, DeleteDialog, Notice } from "@/types/admin";
import { AdminDeleteDialog, AdminNotice } from "./AdminFeedback";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminPageHeader } from "./AdminPageHeader";
import {
  AccountsSection,
  ActivitySection,
  DashboardSection,
  DocumentsSection,
} from "./AdminSections";
import { AdminSidebar } from "./AdminSidebar";

/**
 * Main admin workspace container.
 *
 * This component owns session state, API loading state, deletion workflows,
 * and section switching. Presentational UI is split into smaller components.
 */
export function AdminWorkspace() {
  const router = useRouter();

  /**
   * Subscribe to the auth session store.
   *
   * useSyncExternalStore keeps the UI in sync when login/logout changes the
   * session outside this component.
   */
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  const [activeSection, setActiveSection] =
    useState<AdminSection>("dashboard");
  const [summary, setSummary] = useState<AdminSummary>(emptyAdminSummary);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>(null);
  const [notice, setNotice] = useState<Notice>(null);

  /**
   * Backend admin APIs require ADMIN role.
   */
  const isAdmin = session?.role?.toUpperCase() === "ADMIN";

  /**
   * Refresh all admin data while keeping the current UI visible.
   */
  function refreshAdminData(token: string) {
    setIsLoading(true);
    setErrorMessage("");

    void fetchAdminBundle(token)
      .then((bundle) =>
        applyAdminBundle(bundle, {
          setSummary,
          setUsers,
          setDocuments,
          setAuditLogs,
          setErrorMessage,
        }),
      )
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not refresh admin dashboard.",
        );
      })
      .finally(() => setIsLoading(false));
  }

  /**
   * Load admin data when a valid admin session becomes available.
   *
   * The ignore flag prevents stale responses from overwriting state after the
   * component unmounts or the token changes.
   */
  useEffect(() => {
    if (!session?.token || !isAdmin) {
      return;
    }

    let ignore = false;
    const token = session.token;

    async function loadAdminDashboard() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const bundle = await fetchAdminBundle(token);

        if (ignore) {
          return;
        }

        applyAdminBundle(bundle, {
          setSummary,
          setUsers,
          setDocuments,
          setAuditLogs,
          setErrorMessage,
        });
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load admin dashboard.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminDashboard();

    return () => {
      ignore = true;
    };
  }, [isAdmin, session?.token]);

  /**
   * Keep the activity section lightweight by showing the newest logs only.
   */
  const recentLogs = useMemo(() => auditLogs.slice(0, 10), [auditLogs]);

  /**
   * Clear the local auth session and return to login.
   */
  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  /**
   * Show a temporary toast notification.
   */
  function showNotice(nextNotice: NonNullable<Notice>) {
    setNotice(nextNotice);

    window.setTimeout(() => {
      setNotice((currentNotice) =>
        currentNotice?.title === nextNotice.title ? null : currentNotice,
      );
    }, 3600);
  }

  /**
   * Open the user delete confirmation dialog.
   *
   * Self-deletion is blocked on the client for immediate feedback. The backend
   * should still enforce the same rule.
   */
  function requestDeleteUser(user: AdminUserRow) {
    if (!session?.token || deletingUserId) {
      return;
    }

    if (user.user_id === session.userId) {
      showNotice({
        type: "error",
        title: "Delete blocked",
        message: "You cannot delete the currently signed-in admin account.",
      });
      return;
    }

    setDeleteDialog({ kind: "user", user });
  }

  /**
   * Open the document delete confirmation dialog.
   */
  function requestDeleteDocument(document: AdminDocumentRow) {
    if (!session?.token || deletingDocumentId) {
      return;
    }

    setDeleteDialog({ kind: "document", document });
  }

  /**
   * Delete a user after confirmation, then refresh all admin panels.
   */
  async function executeDeleteUser(user: AdminUserRow) {
    if (!session?.token || deletingUserId) {
      return;
    }

    if (user.user_id === session.userId) {
      showNotice({
        type: "error",
        title: "Delete blocked",
        message: "You cannot delete the currently signed-in admin account.",
      });
      return;
    }

    setDeletingUserId(user.user_id);
    setDeleteDialog(null);
    setErrorMessage("");

    try {
      await deleteAdminUser(user.user_id, session.token);

      const bundle = await fetchAdminBundle(session.token);

      applyAdminBundle(bundle, {
        setSummary,
        setUsers,
        setDocuments,
        setAuditLogs,
        setErrorMessage,
      });

      showNotice({
        type: "success",
        title: "User deleted",
        message: `${user.username || user.email} was removed from DeepReader.`,
      });
    } catch (error) {
      showNotice({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof Error ? error.message : "Could not delete this user.",
      });
    } finally {
      setDeletingUserId("");
    }
  }

  /**
   * Delete a document after confirmation, then refresh all admin panels.
   */
  async function executeDeleteDocument(document: AdminDocumentRow) {
    if (!session?.token || deletingDocumentId) {
      return;
    }

    setDeletingDocumentId(document.document_id);
    setDeleteDialog(null);
    setErrorMessage("");

    try {
      await deleteAdminDocument(document.document_id, session.token);

      const bundle = await fetchAdminBundle(session.token);

      applyAdminBundle(bundle, {
        setSummary,
        setUsers,
        setDocuments,
        setAuditLogs,
        setErrorMessage,
      });

      showNotice({
        type: "success",
        title: "Document deleted",
        message: `${document.file_name} was removed from the library.`,
      });
    } catch (error) {
      showNotice({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete this document.",
      });
    } finally {
      setDeletingDocumentId("");
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#edf3fb] text-[#0f172a]">
      <div className="flex min-h-screen">
        <AdminSidebar
          activeSection={activeSection}
          onChangeSection={setActiveSection}
          onLogout={handleLogout}
        />

        <section className="min-w-0 flex-1 lg:pl-[292px]">
          <AdminMobileNav
            activeSection={activeSection}
            onChangeSection={setActiveSection}
          />

          <div className="mx-auto grid w-full max-w-[1240px] gap-5 px-3 py-5 sm:gap-6 sm:px-5 sm:py-6 lg:px-6 xl:px-0">
            <AdminPageHeader
              activeSection={activeSection}
              isLoading={isLoading}
              onRefresh={() => {
                if (session?.token && isAdmin) {
                  refreshAdminData(session.token);
                }
              }}
            />

            {errorMessage ? (
              <div className="rounded-[12px] border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[13px] font-bold leading-6 text-[#be123c] sm:px-5 sm:py-4 sm:text-[14px]">
                {errorMessage}
              </div>
            ) : null}

            {activeSection === "dashboard" ? (
              <DashboardSection
                summary={summary}
                documents={documents}
                auditLogs={auditLogs}
              />
            ) : activeSection === "accounts" ? (
              <AccountsSection
                users={users}
                isLoading={isLoading}
                currentUserId={session?.userId || ""}
                deletingUserId={deletingUserId}
                onDeleteUser={requestDeleteUser}
              />
            ) : activeSection === "documents" ? (
              <DocumentsSection
                documents={documents}
                isLoading={isLoading}
                deletingDocumentId={deletingDocumentId}
                onDeleteDocument={requestDeleteDocument}
              />
            ) : (
              <ActivitySection logs={recentLogs} isLoading={isLoading} />
            )}
          </div>
        </section>
      </div>

      <AdminDeleteDialog
        dialog={deleteDialog}
        isBusy={Boolean(deletingUserId || deletingDocumentId)}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={() => {
          if (deleteDialog?.kind === "user") {
            void executeDeleteUser(deleteDialog.user);
          } else if (deleteDialog?.kind === "document") {
            void executeDeleteDocument(deleteDialog.document);
          }
        }}
      />

      <AdminNotice notice={notice} onClose={() => setNotice(null)} />
    </main>
  );
}