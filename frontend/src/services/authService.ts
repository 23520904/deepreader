import { apiRequestJson } from "@/services/apiClient";
import type {
  AuthCredentials,
  AuthMessageResponse,
  AuthResponse,
  ForgotPasswordPayload,
  GoogleAuthPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from "@/types/auth";

type AuthRequestOptions = {
  requestId?: string;
};

function buildAuthPayload(credentials: AuthCredentials) {
  return JSON.stringify({
    username: credentials.username,
    email: credentials.email,
    password: credentials.password,
  });
}

function requestAuth(
  endpoint: "/api/v1/auth/login" | "/api/v1/auth/register",
  credentials: AuthCredentials,
  fallbackError: string,
  options: AuthRequestOptions = {},
) {
  const payload = buildAuthPayload(credentials);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.requestId) {
    headers["X-DeepReader-Request-Id"] = options.requestId;
  }

  if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "true") {
    console.debug("[DeepReader auth payload]", {
      endpoint,
      requestId: options.requestId,
      body: {
        ...JSON.parse(payload),
        password: "[redacted]",
      },
    });
  }

  return apiRequestJson<AuthResponse | AuthMessageResponse>(endpoint, {
    method: "POST",
    headers,
    body: payload,
    fallbackError,
  });
}

export function loginUser(credentials: AuthCredentials) {
  return requestAuth(
    "/api/v1/auth/login",
    credentials,
    "Email or password is incorrect.",
  ) as Promise<AuthResponse>;
}

export function registerUser(
  credentials: AuthCredentials,
  options: AuthRequestOptions = {},
) {
  return requestAuth(
    "/api/v1/auth/register",
    credentials,
    "Could not create an account right now.",
    options,
  ) as Promise<AuthMessageResponse>;
}

export function verifyEmail(payload: VerifyEmailPayload) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/verify-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    fallbackError: "Could not verify your email right now.",
  });
}

export function resendOtp(email: string) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/resend-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    fallbackError: "Could not resend the verification code right now.",
  });
}

export function googleLogin(payload: GoogleAuthPayload) {
  return apiRequestJson<AuthResponse>("/api/v1/auth/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    fallbackError: "Could not continue with Google right now.",
  });
}

export function forgotPassword(payload: ForgotPasswordPayload) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    fallbackError: "Could not send a reset code right now.",
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return apiRequestJson<AuthMessageResponse>("/api/v1/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    fallbackError: "Could not reset your password right now.",
  });
}
