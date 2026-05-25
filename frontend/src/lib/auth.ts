export type {
  AuthCredentials,
  AuthResponse,
  UpdateProfilePayload,
  UserProfile,
} from "@/types/auth";
export { loginUser, registerUser } from "@/services/authService";
export { fetchUserProfile, updateUserProfile } from "@/services/profileService";
export {
  clearAuthSession,
  getAuthSession,
  getAuthSessionSnapshot,
  saveAuthSession,
  subscribeAuthSession,
  syncProfileIntoSession,
} from "@/lib/authSession";
