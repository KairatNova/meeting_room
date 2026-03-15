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
  full_name: string;
  telegram_username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Ответ после регистрации. */
export interface RegisterResponse {
  message: string;
  email: string;
  telegram_link?: string | null;
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

/** Запрос на сброс пароля: email или telegram. */
export interface ForgotPasswordRequest {
  email?: string | null;
  telegram?: string | null;
}

/** Запрос смены пароля по коду (login = email или telegram). */
export interface ResetPasswordRequest {
  login: string;
  reset_code: string;
  new_password: string;
}

/** Запрос входа с кодом (шаг 1: отправить код). */
export interface LoginRequest {
  login: string;
  password: string;
}

/** Ответ после запроса входа: куда отправлен код. */
export interface LoginRequestResponse {
  message: string;
  channel: "telegram" | "email";
}

/** Ввод кода входа (шаг 2). */
export interface LoginVerifyRequest {
  login: string;
  verification_code: string;
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
  region?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  created_at: string;
  photos?: RoomPhoto[];
}

export interface RoomCreate {
  name: string;
  description?: string | null;
  capacity: number;
  amenities?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
}

export interface RoomUpdate {
  name?: string;
  description?: string | null;
  capacity?: number;
  amenities?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
}

export interface RoomReview {
  id: number;
  room_id: number;
  user_id: number;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface RoomReviewCreate {
  rating: number;
  comment: string;
}

export interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  room_name?: string | null;
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
