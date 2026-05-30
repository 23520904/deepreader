import type { UploadProgressSnapshot } from "@/types/library";

type ApiRequestOptions = RequestInit & {
  token?: string;
  fallbackError: string;
  transformErrorMessage?: (message: string) => string;
};

type BlobRequestOptions = {
  token: string;
  fallbackError: string;
  transformErrorMessage?: (message: string) => string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl = normalizeApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!apiBaseUrl) {
    return hasApiBasePath(normalizedPath)
      ? normalizedPath
      : `/api/v1${normalizedPath}`;
  }

  if (apiBaseUrl.endsWith("/api/v1") && hasApiBasePath(normalizedPath)) {
    return `${apiBaseUrl}${normalizedPath.slice("/api/v1".length)}`;
  }

  if (apiBaseUrl.startsWith("/") && normalizedPath.startsWith(`${apiBaseUrl}/`)) {
    return normalizedPath;
  }

  return `${apiBaseUrl}${normalizedPath}`;
}

function normalizeApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!configured || configured === "/") {
    return "";
  }

  return configured.replace(/\/$/, "");
}

function hasApiBasePath(path: string) {
  return path === "/api/v1" || path.startsWith("/api/v1/");
}

function isApiDebugEnabled() {
  return process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
}

function redactRequestBody(body: BodyInit | null | undefined) {
  if (typeof body !== "string") {
    return body ? "[non-string body]" : undefined;
  }

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;

    if ("password" in parsed) {
      parsed.password = "[redacted]";
    }

    return parsed;
  } catch {
    return body;
  }
}

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

export function friendlyProviderError(message: string) {
  if (message.includes("invalid_api_key") || message.includes("Incorrect API key")) {
    return "The configured AI key was rejected. Update the Groq or Gemini key, then retry.";
  }

  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota") ||
    message.includes("TOO_MANY_REQUESTS")
  ) {
    return "AI quota or rate limit was exceeded. DeepReader tries Groq first and falls back to Gemini when available.";
  }

  return message;
}

export async function parseErrorMessage(
  response: Response,
  fallback: string,
  transformErrorMessage?: (message: string) => string,
) {
  try {
    const payload = (await response.json()) as {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
      title?: unknown;
      errors?: unknown;
    };
    const message = unwrapErrorMessage(extractErrorMessage(payload, fallback));

    return transformErrorMessage ? transformErrorMessage(message) : message;
  } catch {
    return transformErrorMessage ? transformErrorMessage(fallback) : fallback;
  }
}

function extractErrorMessage(
  payload: {
    error?: unknown;
    message?: unknown;
    detail?: unknown;
    title?: unknown;
    errors?: unknown;
  },
  fallback: string,
) {
  const directMessage =
    firstString(payload.error) ??
    firstString(payload.message) ??
    firstString(payload.detail);

  if (directMessage) {
    return directMessage;
  }

  const errorsMessage = formatErrors(payload.errors);

  if (errorsMessage) {
    return errorsMessage;
  }

  return firstString(payload.title) ?? fallback;
}

function firstString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    return (
      value.find(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      ) ?? null
    );
  }

  return null;
}

function formatErrors(value: unknown) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const error = item as { field?: unknown; message?: unknown; defaultMessage?: unknown };
          const message = firstString(error.message) ?? firstString(error.defaultMessage);
          const field = firstString(error.field);

          return field && message ? `${field} ${message}` : message;
        }

        return null;
      })
      .filter((item): item is string => Boolean(item));

    return messages.length > 0 ? messages.join("; ") : null;
  }

  if (typeof value === "object") {
    const messages = Object.entries(value)
      .map(([field, message]) => {
        const text = firstString(message);

        return text ? `${field} ${text}` : null;
      })
      .filter((item): item is string => Boolean(item));

    return messages.length > 0 ? messages.join("; ") : null;
  }

  return null;
}

export async function apiRequestJson<T>(
  path: string,
  { token, fallbackError, transformErrorMessage, ...options }: ApiRequestOptions,
) {
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = resolveApiUrl(path);

  if (isApiDebugEnabled()) {
    console.debug("[DeepReader API request]", {
      url: requestUrl,
      method: options.method ?? "GET",
      body: redactRequestBody(options.body),
    });
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
      body: options.body,
    });
  } catch (error) {
    if (isApiDebugEnabled()) {
      console.debug("[DeepReader API network error]", {
        url: requestUrl,
        method: options.method ?? "GET",
        error,
      });
    }

    throw error;
  }

  if (isApiDebugEnabled()) {
    const responseClone = response.clone();
    responseClone
      .text()
      .then((body) => {
        console.debug("[DeepReader API response]", {
          url: requestUrl,
          status: response.status,
          body,
        });
      })
      .catch(() => {
        console.debug("[DeepReader API response]", {
          url: requestUrl,
          status: response.status,
          body: "[unavailable]",
        });
      });
  }

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

  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

export async function apiRequestBlob(
  path: string,
  { token, fallbackError, transformErrorMessage }: BlobRequestOptions,
) {
  const response = await fetch(resolveApiUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
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
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startedAt = performance.now();

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
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      emitProgress(event.loaded, event.total);
    };

    xhr.upload.onload = () => {
      const file = formData.get("file");
      const totalBytes = file instanceof File ? file.size : 0;
      emitProgress(totalBytes, totalBytes);
    };

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
