import { api } from "./client";
import type { Booking, BookingCreate } from "../types/api";

const PREFIX = "/api/bookings";

export const bookingsApi = {
  list: (params?: { room_id?: number; from_time?: string; to_time?: string }) =>
    api.get<Booking[]>(PREFIX, { params: params as Record<string, string | number | boolean | undefined> }),

  myBookings: (params?: { from_time?: string; to_time?: string }) =>
    api.get<Booking[]>(`${PREFIX}/me`, { params: params as Record<string, string | number | boolean | undefined> }),

  getById: (id: number) => api.get<Booking>(`${PREFIX}/${id}`),

  create: (data: BookingCreate) => api.post<Booking>(PREFIX, data),
  cancel: (id: number) => api.delete<void>(`${PREFIX}/${id}`),
};
