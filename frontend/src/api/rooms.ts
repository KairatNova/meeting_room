import { api } from "./client";
import { ApiError } from "./client";
import type { Room, RoomCreate, RoomUpdate, RoomReview, RoomReviewCreate } from "../types/api";

const PREFIX = "/api/rooms";

async function getToken(): Promise<string | null> {
  return localStorage.getItem("access_token");
}

export const roomsApi = {
  list: (params?: {
    capacity_min?: number;
    search?: string;
    amenities?: string;
    region?: string;
    city?: string;
    district?: string;
    address?: string;
    sort_by?: string;
  }) =>
    api.get<Room[]>(PREFIX, { params: params as Record<string, string | number | boolean | undefined> }),

  get: (id: number) => api.get<Room>(`${PREFIX}/${id}`),

  create: (data: RoomCreate) => api.post<Room>(PREFIX, data),
  update: (id: number, data: RoomUpdate) => api.patch<Room>(`${PREFIX}/${id}`, data),
  delete: (id: number) => api.delete<void>(`${PREFIX}/${id}`),

  /** Загрузить фотографии комнаты (multipart). */
  uploadPhotos: async (roomId: number, files: File[]): Promise<Room> => {
    const token = await getToken();
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`${PREFIX}/${roomId}/photos`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detail = (body as { detail?: string }).detail ?? res.statusText;
      throw new ApiError(res.status, detail);
    }
    return res.json() as Promise<Room>;
  },

  /** Удалить фотографию комнаты. */
  deletePhoto: (roomId: number, photoId: number) =>
    api.delete<void>(`${PREFIX}/${roomId}/photos/${photoId}`),

  listReviews: (roomId: number) => api.get<RoomReview[]>(`${PREFIX}/${roomId}/reviews`),
  createReview: (roomId: number, data: RoomReviewCreate) =>
    api.post<RoomReview>(`${PREFIX}/${roomId}/reviews`, data),
};
