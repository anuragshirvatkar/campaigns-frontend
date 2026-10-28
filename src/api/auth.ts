import { api } from "./client";
import type { AuthResponse, Me, NotificationPreferences, User, UserRole } from "./types";

export const authApi = {
  signup: (body: { email: string; password: string; fullName: string }) =>
    api<AuthResponse>("/auth/signup", { method: "POST", body }),
  login: (body: { email: string; password: string; role: UserRole }) => api<AuthResponse>("/auth/login", { method: "POST", body }),
  forgotPassword: (body: { email: string }) => api<{ message: string }>("/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    api<AuthResponse>("/auth/reset-password", { method: "POST", body }),
  google: (body: { idToken: string }) => api<AuthResponse>("/auth/google", { method: "POST", body }),
  me: () => api<Me>("/me"),
  updateMe: (body: { fullName?: string; avatarUrl?: string | null; appIntroduced?: boolean; assistantEnabled?: boolean }) => api<User>("/me", { method: "PATCH", body }),
  notificationPreferences: () => api<NotificationPreferences>("/me/notification-preferences"),
  saveNotificationPreferences: (body: NotificationPreferences) =>
    api<NotificationPreferences>("/me/notification-preferences", { method: "PUT", body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<void>("/me/password", { method: "POST", body }),
};
