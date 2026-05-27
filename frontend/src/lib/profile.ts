import type { AuthResponse, UpdateProfilePayload, UserProfile } from "@/types/auth";

export type ProfileDraft = {
  userId: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  avatarUrl: string;
};

export function emptyProfileDraft(userId = ""): ProfileDraft {
  return {
    userId,
    username: "",
    fullName: "",
    phoneNumber: "",
    location: "",
    avatarUrl: "",
  };
}

export function getProfileDisplayName(email: string) {
  const localPart = email.split("@")[0] || "Reader";

  return localPart
    .replace(/[._-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createProfileDraftFromSession(session: AuthResponse | null): ProfileDraft {
  if (!session) {
    return emptyProfileDraft();
  }

  return {
    ...emptyProfileDraft(session.userId),
    username: session.username?.trim() || getProfileDisplayName(session.email),
    avatarUrl: session.avatarUrl?.trim() ?? "",
  };
}

export function createProfileDraftFromProfile(profile: UserProfile): ProfileDraft {
  return {
    userId: profile.userId,
    username: profile.username?.trim() || getProfileDisplayName(profile.email),
    fullName: profile.fullName?.trim() ?? "",
    phoneNumber: profile.phoneNumber?.trim() ?? "",
    location: profile.location?.trim() ?? "",
    avatarUrl: profile.avatarUrl?.trim() ?? "",
  };
}

export function optionalProfileText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export function toUpdateProfilePayload(draft: ProfileDraft): UpdateProfilePayload {
  return {
    username: draft.username.trim(),
    fullName: optionalProfileText(draft.fullName),
    phoneNumber: optionalProfileText(draft.phoneNumber),
    location: optionalProfileText(draft.location),
    avatarUrl: optionalProfileText(draft.avatarUrl),
  };
}
