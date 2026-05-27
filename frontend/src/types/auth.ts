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

export type AuthMessageResponse = {
  message: string;
  email: string;
};

export type VerifyEmailPayload = {
  email: string;
  otp: string;
};

export type GoogleAuthPayload = {
  idToken: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  newPassword: string;
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
