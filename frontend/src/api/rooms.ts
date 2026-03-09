import { api } from "./client";
import type { Room, RoomCreate, RoomUpdate } from "../types/api";

const PREFIX = "/api/rooms";

export const roomsApi = {
  list: (params?: { capacity_min?: number; search?: string }) =>
    api.get<Room[]>(PREFIX, { params: params as Record<string, string | number | boolean | undefined> }),

  get: (id: number) => api.get<Room>(`${PREFIX}/${id}`),

  create: (data: RoomCreate) => api.post<Room>(PREFIX, data),
  update: (id: number, data: RoomUpdate) => api.patch<Room>(`${PREFIX}/${id}`, data),
  delete: (id: number) => api.delete<void>(`${PREFIX}/${id}`),
};
