/**
 * Типы, соответствующие ответам и запросам backend API.
 * Синхронизировать с FastAPI schemas при изменении контракта.
 */

export interface User {
  id: number;
  email: string;
  full_name: string;
  display_name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  citizenship?: string | null;
  is_admin: boolean;
  is_verified?: boolean;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegister {
  email: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Ответ после регистрации: код отправлен на email. */
export interface RegisterResponse {
  message: string;
  email: string;
}

/** Короткая информация о пользователе в ответах авторизации. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

/** Ответ после успешного подтверждения email: сразу логин. */
export interface VerifyEmailLoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/** Универсальный ответ с сообщением. */
export interface MessageResponse {
  message: string;
}

/** Запрос на сброс пароля (забыли пароль). */
export interface ForgotPasswordRequest {
  email: string;
}

/** Запрос смены пароля по коду. */
export interface ResetPasswordRequest {
  email: string;
  reset_code: string;
  new_password: string;
}

export interface RoomPhoto {
  id: number;
  url: string;
}

export interface Room {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  amenities: string | null;
  created_at: string;
  photos?: RoomPhoto[];
}

export interface RoomCreate {
  name: string;
  description?: string | null;
  capacity: number;
  amenities?: string | null;
}

export interface RoomUpdate {
  name?: string;
  description?: string | null;
  capacity?: number;
  amenities?: string | null;
}

export interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface BookingCreate {
  room_id: number;
  start_time: string;
  end_time: string;
}

export interface UserProfileUpdate {
  full_name?: string | null;
  display_name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  citizenship?: string | null;
}
