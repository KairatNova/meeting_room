import { api } from "./client";
import type { AdminUserBrief, DemoteAdminResponse, PromoteAdminResponse } from "../types/api";

const PREFIX = "/api/admin";

export const adminApi = {
  listAdmins: () => api.get<AdminUserBrief[]>(`${PREFIX}/admins`),

  promoteUser: (email: string) =>
    api.post<PromoteAdminResponse>(`${PREFIX}/promote-user`, { email: email.trim() }),

  demoteAdmin: (userId: number) =>
    api.delete<DemoteAdminResponse>(`${PREFIX}/admins/${userId}`),
};
