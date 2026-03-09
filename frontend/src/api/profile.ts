import { api } from "./client";
import type { User, UserProfileUpdate } from "../types/api";

export const profileApi = {
  // Для получения текущего пользователя переиспользуем /auth/me
  getMe: () => api.get<User>("/api/auth/me"),
  update: (data: UserProfileUpdate) => api.patch<User>("/api/users/me", data),
};

