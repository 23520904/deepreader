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

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8083";

  return `${apiBaseUrl}${path}`;
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
    return "Groq rejected the API key. Update the Groq key or the LLM token saved in your profile, then retry.";
  }

  if (
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota") ||
    message.includes("TOO_MANY_REQUESTS")
  ) {
    return "Groq quota or rate limit was exceeded. Check billing/quota settings or retry later.";
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
      error?: string;
      message?: string;
    };
    const message = unwrapErrorMessage(payload.error ?? payload.message ?? fallback);

    return transformErrorMessage ? transformErrorMessage(message) : message;
  } catch {
    return transformErrorMessage ? transformErrorMessage(fallback) : fallback;
  }
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

  const response = await fetch(path, {
    ...options,
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

  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

export async function apiRequestBlob(
  path: string,
  { token, fallbackError, transformErrorMessage }: BlobRequestOptions,
) {
  const response = await fetch(path, {
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
