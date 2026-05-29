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
  verificationCode?: string;
};

export type AuthMessageResponse = {
  message: string;
};

export type EmailOtpPayload = {
  email: string;
};

export type PasswordResetPayload = {
  email: string;
  verificationCode: string;
  password: string;
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
