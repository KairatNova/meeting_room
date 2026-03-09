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

/** Запрос подтверждения email. */
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

/** Ответ после успешного подтверждения email. */
export interface VerifyEmailResponse {
  message: string;
}

export interface Room {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  amenities: string | null;
  created_at: string;
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
