import { apiRequestJson, requestUploadWithProgress } from "@/services/apiClient";
import type {
  BackendBook,
  BookUploadResponse,
  UploadProgressSnapshot,
} from "@/types/library";

export function fetchLibraryBooks(token: string) {
  return apiRequestJson<BackendBook[]>("/api/v1/books", {
    token,
    fallbackError: "Could not load your library.",
  });
}

export function uploadLibraryBook({
  token,
  formData,
  onProgress,
}: {
  token: string;
  formData: FormData;
  onProgress: (snapshot: UploadProgressSnapshot) => void;
}) {
  return requestUploadWithProgress<BookUploadResponse>({
    path: "/api/v1/books/upload",
    token,
    formData,
    fallbackError: "Upload failed.",
    onProgress,
  });
}

export function deleteLibraryBook(token: string, documentId: string) {
  return apiRequestJson<unknown>(
    `/api/v1/books/${encodeURIComponent(documentId)}`,
    {
      token,
      method: "DELETE",
      fallbackError: "Could not delete this document.",
    },
  );
}
