import { apiRequestJson } from "@/services/apiClient";
import type { AuthCredentials, AuthResponse } from "@/types/auth";

function requestAuth(
  endpoint: "/api/v1/auth/login" | "/api/v1/auth/register",
  credentials: AuthCredentials,
  fallbackError: string,
) {
  return apiRequestJson<AuthResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify(credentials),
    fallbackError,
  });
}

export function loginUser(credentials: AuthCredentials) {
  return requestAuth(
    "/api/v1/auth/login",
    credentials,
    "Email or password is incorrect.",
  );
}

export function registerUser(credentials: AuthCredentials) {
  return requestAuth(
    "/api/v1/auth/register",
    credentials,
    "Could not create an account right now.",
  );
}
