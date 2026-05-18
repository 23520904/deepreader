import type { AuthResponse, UserProfile } from "@/types/auth";

const AUTH_STORAGE_KEY = "deepreader.auth";
const AUTH_CHANGE_EVENT = "deepreader.auth.changed";
let cachedAuthSessionRaw: string | null | undefined;
let cachedAuthSession: AuthResponse | null = null;

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

export function syncProfileIntoSession(profile: UserProfile) {
  const session = getAuthSession();

  if (!session) {
    return null;
  }

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
