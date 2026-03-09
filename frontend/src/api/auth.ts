import { api } from "./client";
import type {
  User,
  UserLogin,
  UserRegister,
  TokenResponse,
  RegisterResponse,
  VerifyEmailResponse,
} from "../types/api";

const AUTH_PREFIX = "/api";

export const authApi = {
  /** Регистрация: создаётся пользователь, код отправляется на email. Возвращает { message, email }. */
  register: (data: UserRegister) =>
    api.post<RegisterResponse>(`${AUTH_PREFIX}/auth/register`, data),

  /** Подтверждение email по коду из письма. */
  verifyEmail: (email: string, code: string) =>
    api.post<VerifyEmailResponse>(`${AUTH_PREFIX}/auth/verify-email`, { email, code }),

  login: (data: UserLogin) =>
    api.post<TokenResponse>(`${AUTH_PREFIX}/auth/login`, data),

  /** Текущий пользователь по JWT (для восстановления сессии). */
  me: () => api.get<User>(`${AUTH_PREFIX}/auth/me`).catch(() => null),
};
