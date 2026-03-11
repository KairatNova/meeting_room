import { api } from "./client";
import type {
  User,
  UserLogin,
  UserRegister,
  TokenResponse,
  RegisterResponse,
  VerifyEmailLoginResponse,
  MessageResponse,
  ResetPasswordRequest,
} from "../types/api";

const AUTH_PREFIX = "/api";

export const authApi = {
  /** Регистрация: создаётся пользователь, код отправляется на email. Возвращает { message, email }. */
  register: (data: UserRegister) =>
    api.post<RegisterResponse>(`${AUTH_PREFIX}/auth/register`, data),

  /** Подтверждение email по коду из письма: сразу логин (JWT + user). */
  verifyEmail: (email: string, code: string) =>
    api.post<VerifyEmailLoginResponse>(`${AUTH_PREFIX}/auth/verify-email`, {
      email,
      verification_code: code,
    }),

  login: (data: UserLogin) =>
    api.post<TokenResponse>(`${AUTH_PREFIX}/auth/login`, data),

  /** Забыли пароль: отправка кода на email. */
  forgotPassword: (email: string) =>
    api.post<MessageResponse>(`${AUTH_PREFIX}/auth/forgot-password`, { email }),

  /** Сброс пароля по коду. */
  resetPassword: (data: ResetPasswordRequest) =>
    api.post<MessageResponse>(`${AUTH_PREFIX}/auth/reset-password`, data),

  /** Текущий пользователь по JWT (для восстановления сессии). */
  me: () => api.get<User>(`${AUTH_PREFIX}/auth/me`).catch(() => null),
};
