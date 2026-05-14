export type AuthResponse = {
  userId: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
  token: string;
  refreshToken: string;
  role: string;
};

export type AuthCredentials = {
  email: string;
  password: string;
  username?: string;
};

export type UserProfile = {
  userId: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  role: string;
};

export type UpdateProfilePayload = {
  username: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
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

function requireAuthSession() {
  const session = getAuthSession();

  if (!session) {
    throw new Error("Please log in again.");
  }

  return session;
}

function syncProfileIntoSession(profile: UserProfile) {
  const session = requireAuthSession();
  const nextSession = {
    ...session,
    email: profile.email,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
  };

  saveAuthSession(nextSession);
  return nextSession;
}

export async function fetchUserProfile() {
  const session = requireAuthSession();
  const response = await fetch("/api/v1/users/me", {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Could not load profile."));
  }

  const profile = (await response.json()) as UserProfile;
  syncProfileIntoSession(profile);

  return profile;
}

export async function updateUserProfile(payload: UpdateProfilePayload) {
  const session = requireAuthSession();
  const response = await fetch("/api/v1/users/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Could not update profile."));
  }

  const profile = (await response.json()) as UserProfile;
  syncProfileIntoSession(profile);

  return profile;
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
