import type { UploadProgressSnapshot } from "@/types/library";

/**
 * Common options used for JSON API requests.
 */
type ApiRequestOptions = RequestInit & {
  /**
   * Pass this for APIs that require authentication.
   * If token is provided but empty/undefined, the request will be rejected early.
   */
  token?: string;

  /**
   * Optional override.
   * - true: force this request to require a Bearer token.
   * - false: allow request without token even if token is omitted.
   */
  requiresAuth?: boolean;

  fallbackError: string;
  transformErrorMessage?: (message: string) => string;
};

/**
 * Options used when downloading binary files (PDF, blob, etc.).
 */
type BlobRequestOptions = {
  token: string;
  fallbackError: string;
  transformErrorMessage?: (message: string) => string;
};

/**
 * Custom API error that also stores HTTP status code.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Check whether an error is related to authentication/authorization.
 */
export function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Build a full API URL from a relative path.
 * If the path is already an absolute URL, return it unchanged.
 */
export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8083";

  return `${apiBaseUrl}${path}`;
}

/**
 * Some backend services may return nested JSON error strings.
 * This function keeps unwrapping them until a readable message is found.
 */
export function unwrapErrorMessage(value: string, maxDepth = 4) {
  let message = value;

  for (let index = 0; index < maxDepth; index += 1) {
    const trimmed = message.trim();

    if (!trimmed.startsWith("{")) {
      break;
    }

    try {
      const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
      message = parsed.error ?? parsed.message ?? message;
    } catch {
      break;
    }
  }

  return message;
}

/**
 * Convert provider-specific AI errors into user-friendly messages.
 */
export function friendlyProviderError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    message.includes("invalid_api_key") ||
    message.includes("Incorrect API key") ||
    lowerMessage.includes("api key is invalid") ||
    lowerMessage.includes("invalid or expired") ||
    lowerMessage.includes("unauthorized")
  ) {
    return "The configured AI key was rejected. Update the Groq or Gemini key, then retry.";
  }

  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    lowerMessage.includes("quota") ||
    message.includes("TOO_MANY_REQUESTS") ||
    lowerMessage.includes("rate limit")
  ) {
    return "AI quota or rate limit was exceeded. DeepReader tries Groq first and falls back to Gemini when available.";
  }

  return message;
}

/**
 * Extract a readable error message from an API response.
 * Falls back to a default message if parsing fails.
 */
export async function parseErrorMessage(
  response: Response,
  fallback: string,
  transformErrorMessage?: (message: string) => string,
) {
  try {
    const responseText = await response.text();

    if (!responseText.trim()) {
      return transformErrorMessage ? transformErrorMessage(fallback) : fallback;
    }

    let message = responseText;

    try {
      const payload = JSON.parse(responseText) as {
        error?: string;
        message?: string;
      };

      message = payload.error ?? payload.message ?? responseText;
    } catch {
      message = responseText;
    }

    const readableMessage = unwrapErrorMessage(message);

    return transformErrorMessage
      ? transformErrorMessage(readableMessage)
      : readableMessage;
  } catch {
    return transformErrorMessage ? transformErrorMessage(fallback) : fallback;
  }
}

/**
 * Normalize and validate an auth token.
 */
function cleanAuthToken(token: string | undefined) {
  return typeof token === "string" ? token.trim() : "";
}

/**
 * Generic helper for JSON API requests.
 * Automatically handles:
 * - Authorization header
 * - JSON content type
 * - Error parsing
 * - Empty responses
 */
export async function apiRequestJson<T>(
  path: string,
  options: ApiRequestOptions,
) {
  const {
    token,
    requiresAuth,
    fallbackError,
    transformErrorMessage,
    ...requestOptions
  } = options;

  const headers = new Headers(requestOptions.headers);

  /**
   * If the caller includes the `token` option, this usually means the endpoint
   * requires auth. This catches cases where session.token is undefined/empty
   * before the request reaches the backend as "Missing Bearer token".
   */
  const tokenOptionWasProvided = Object.prototype.hasOwnProperty.call(
    options,
    "token",
  );

  const shouldRequireAuth = requiresAuth ?? tokenOptionWasProvided;
  const cleanedToken = cleanAuthToken(token);

  if (cleanedToken) {
    headers.set("Authorization", `Bearer ${cleanedToken}`);
  } else if (shouldRequireAuth) {
    throw new ApiError(
      "Your login session is missing or expired. Please log in again.",
      401,
    );
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    requestOptions.body &&
    !headers.has("Content-Type") &&
    !(requestOptions.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(resolveApiUrl(path), {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(
      await parseErrorMessage(response, fallbackError, transformErrorMessage),
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText.trim()) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

/**
 * Download binary content such as PDF files.
 * Rejects responses that unexpectedly return JSON/text errors.
 */
export async function apiRequestBlob(
  path: string,
  { token, fallbackError, transformErrorMessage }: BlobRequestOptions,
) {
  const cleanedToken = cleanAuthToken(token);

  if (!cleanedToken) {
    throw new ApiError(
      "Your login session is missing or expired. Please log in again.",
      401,
    );
  }

  const response = await fetch(resolveApiUrl(path), {
    headers: {
      Authorization: `Bearer ${cleanedToken}`,
      Accept: "application/pdf,application/octet-stream,*/*",
    },
  });

  if (!response.ok) {
    throw new ApiError(
      await parseErrorMessage(response, fallbackError, transformErrorMessage),
      response.status,
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json") || contentType.startsWith("text/")) {
    throw new ApiError(
      await parseErrorMessage(response, fallbackError, transformErrorMessage),
      response.status,
    );
  }

  return response.blob();
}

/**
 * Parse upload response data.
 * Attempts JSON parsing first and falls back to plain text.
 */
function parseUploadResponse(xhr: XMLHttpRequest) {
  if (!xhr.responseText) {
    return null;
  }

  try {
    return JSON.parse(xhr.responseText) as unknown;
  } catch {
    return xhr.responseText;
  }
}

/**
 * Extract a readable error message from upload responses.
 */
function parseUploadError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return unwrapErrorMessage(payload);
  }

  if (payload && typeof payload === "object") {
    const errorPayload = payload as { error?: unknown; message?: unknown };
    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : typeof errorPayload.message === "string"
          ? errorPayload.message
          : fallback;

    return unwrapErrorMessage(message);
  }

  return fallback;
}

/**
 * Upload a file using XMLHttpRequest so upload progress can be tracked.
 *
 * Reports:
 * - Upload percentage
 * - Uploaded bytes
 * - Total bytes
 * - Estimated remaining time
 */
export function requestUploadWithProgress<T>({
  path,
  token,
  formData,
  fallbackError,
  onProgress,
}: {
  path: string;
  token: string;
  formData: FormData;
  fallbackError: string;
  onProgress: (snapshot: UploadProgressSnapshot) => void;
}) {
  const cleanedToken = cleanAuthToken(token);

  if (!cleanedToken) {
    return Promise.reject(
      new ApiError(
        "Your login session is missing or expired. Please log in again.",
        401,
      ),
    );
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startedAt = performance.now();

    /**
     * Calculate and emit upload progress information.
     */
    function emitProgress(loadedBytes: number, totalBytes: number) {
      const progress =
        totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;
      const elapsedSeconds = Math.max(
        0.001,
        (performance.now() - startedAt) / 1000,
      );
      const bytesPerSecond = loadedBytes / elapsedSeconds;
      const remainingBytes = Math.max(0, totalBytes - loadedBytes);
      const estimatedSecondsRemaining =
        bytesPerSecond > 0 && remainingBytes > 0
          ? remainingBytes / bytesPerSecond
          : remainingBytes === 0
            ? 0
            : null;

      onProgress({
        progress,
        loadedBytes,
        totalBytes,
        estimatedSecondsRemaining,
      });
    }

    xhr.open("POST", resolveApiUrl(path));
    xhr.setRequestHeader("Authorization", `Bearer ${cleanedToken}`);
    xhr.responseType = "text";

    /**
     * Track upload progress while the file is being sent.
     */
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      emitProgress(event.loaded, event.total);
    };

    /**
     * Ensure progress reaches 100% when upload completes.
     */
    xhr.upload.onload = () => {
      const file = formData.get("file");
      const totalBytes = file instanceof File ? file.size : 0;
      emitProgress(totalBytes, totalBytes);
    };

    /**
     * Handle server response after upload finishes.
     */
    xhr.onload = () => {
      const payload = parseUploadResponse(xhr);

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(parseUploadError(payload, fallbackError), xhr.status));
        return;
      }

      const file = formData.get("file");
      const totalBytes = file instanceof File ? file.size : 0;
      emitProgress(totalBytes, totalBytes);
      resolve(payload as T);
    };

    xhr.onerror = () => reject(new Error(fallbackError));
    xhr.onabort = () => reject(new Error("Upload canceled."));
    xhr.send(formData);
  });
}