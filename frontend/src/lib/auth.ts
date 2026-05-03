export type AuthResponse = {
  userId: string;
  email: string;
  token: string;
  refreshToken: string;
  role: string;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

const AUTH_STORAGE_KEY = "deepreader.auth";
const AUTH_CHANGE_EVENT = "deepreader.auth.changed";
let cachedAuthSessionRaw: string | null | undefined;
let cachedAuthSession: AuthResponse | null = null;

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string;
    };

    return payload.error ?? payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function requestAuth(
  endpoint: "/api/v1/auth/login" | "/api/v1/auth/register",
  credentials: AuthCredentials,
  fallbackError: string,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackError));
  }

  return (await response.json()) as AuthResponse;
}

export function loginUser(credentials: AuthCredentials) {
  return requestAuth(
    "/api/v1/auth/login",
    credentials,
    "Email hoặc mật khẩu chưa đúng.",
  );
}

export function registerUser(credentials: AuthCredentials) {
  return requestAuth(
    "/api/v1/auth/register",
    credentials,
    "Không thể tạo tài khoản lúc này.",
  );
}

export function saveAuthSession(session: AuthResponse) {
  const rawSession = JSON.stringify(session);

  window.localStorage.setItem(AUTH_STORAGE_KEY, rawSession);
  cachedAuthSessionRaw = rawSession;
  cachedAuthSession = session;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function readAuthSessionSnapshot() {
  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (rawSession === cachedAuthSessionRaw) {
    return cachedAuthSession;
  }

  cachedAuthSessionRaw = rawSession;

  if (!rawSession) {
    cachedAuthSession = null;
    return null;
  }

  try {
    cachedAuthSession = JSON.parse(rawSession) as AuthResponse;
    return cachedAuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    cachedAuthSessionRaw = null;
    cachedAuthSession = null;
    return null;
  }
}

export function getAuthSession() {
  return readAuthSessionSnapshot();
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  cachedAuthSessionRaw = null;
  cachedAuthSession = null;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAuthSessionSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  return readAuthSessionSnapshot();
}

export function subscribeAuthSession(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(AUTH_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
  };
}
