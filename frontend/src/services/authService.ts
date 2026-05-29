import { apiRequestJson, resolveApiUrl } from "@/services/apiClient";
import type {
  AuthCredentials,
  AuthMessageResponse,
  AuthResponse,
  EmailOtpPayload,
  PasswordResetPayload,
} from "@/types/auth";

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

function authSetupError(message: string) {
  if (message === "Not Found" || message.includes("404")) {
    return "Auth backend is not updated yet. Restart or rebuild web-module, then try again.";
  }

  return message;
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

export function requestRegistrationOtp(payload: EmailOtpPayload) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/register/request-otp", {
    method: "POST",
    body: JSON.stringify(payload),
    fallbackError: "Could not send verification code right now.",
    transformErrorMessage: authSetupError,
  });
}

export function requestPasswordResetOtp(payload: EmailOtpPayload) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
    fallbackError: "Could not send password reset code right now.",
    transformErrorMessage: authSetupError,
  });
}

export function resetPassword(payload: PasswordResetPayload) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
    fallbackError: "Could not reset password right now.",
  });
}

export function buildGoogleAuthUrl(nextPath = "/") {
  const params = new URLSearchParams();

  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }

  params.set("next", nextPath);

  return `${resolveApiUrl("/api/v1/auth/google/authorize")}?${params.toString()}`;
}
