import { apiRequestJson } from "@/services/apiClient";
import type { UpdateProfilePayload, UserProfile } from "@/types/auth";

export function fetchUserProfile(token: string) {
  return apiRequestJson<UserProfile>("/api/v1/users/me", {
    token,
    fallbackError: "Could not load profile.",
  });
}

export function updateUserProfile(token: string, payload: UpdateProfilePayload) {
  return apiRequestJson<UserProfile>("/api/v1/users/me", {
    token,
    method: "PUT",
    body: JSON.stringify(payload),
    fallbackError: "Could not update profile.",
  });
}
