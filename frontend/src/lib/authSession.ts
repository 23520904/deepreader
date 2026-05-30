import type { AuthResponse, UserProfile } from "@/types/auth";

// LocalStorage key used to store authentication data
const AUTH_STORAGE_KEY = "deepreader.auth";

// Custom event name used to notify components when auth data changes
const AUTH_CHANGE_EVENT = "deepreader.auth.changed";

// In-memory cache to avoid unnecessary JSON parsing
let cachedAuthSessionRaw: string | null | undefined;
let cachedAuthSession: AuthResponse | null = null;

/**
 * Save authentication session to localStorage
 * and notify subscribers about the update.
 */
export function saveAuthSession(session: AuthResponse) {
  const rawSession = JSON.stringify(session);

  window.localStorage.setItem(AUTH_STORAGE_KEY, rawSession);
  cachedAuthSessionRaw = rawSession;
  cachedAuthSession = session;

  // Notify listeners that auth state has changed
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/**
 * Read auth session from localStorage.
 * Uses an in-memory cache to reduce repeated parsing.
 */
function readAuthSessionSnapshot() {
  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

  // Return cached value if storage content has not changed
  if (rawSession === cachedAuthSessionRaw) {
    return cachedAuthSession;
  }

  cachedAuthSessionRaw = rawSession;

  // No session stored
  if (!rawSession) {
    cachedAuthSession = null;
    return null;
  }

  try {
    cachedAuthSession = JSON.parse(rawSession) as AuthResponse;
    return cachedAuthSession;
  } catch {
    // Remove invalid/corrupted session data
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    cachedAuthSessionRaw = null;
    cachedAuthSession = null;
    return null;
  }
}

/**
 * Get current authentication session.
 */
export function getAuthSession() {
  return readAuthSessionSnapshot();
}

/**
 * Remove authentication session from storage
 * and notify subscribers.
 */
export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  cachedAuthSessionRaw = null;
  cachedAuthSession = null;

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/**
 * Snapshot function used by useSyncExternalStore.
 * Returns null during server-side rendering.
 */
export function getAuthSessionSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  return readAuthSessionSnapshot();
}

/**
 * Subscribe to authentication changes.
 * Listens for:
 * - Browser storage updates (cross-tab sync)
 * - Custom auth change events (same tab updates)
 */
export function subscribeAuthSession(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(AUTH_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(AUTH_CHANGE_EVENT, listener);
  };
}

/**
 * Update profile-related information inside
 * the current auth session after fetching
 * the latest user profile from the server.
 */
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