import { api } from "./client";
import type { AdminUserBrief, PromoteAdminResponse } from "../types/api";

const PREFIX = "/api/admin";

export const adminApi = {
  listAdmins: () => api.get<AdminUserBrief[]>(`${PREFIX}/admins`),

  promoteUser: (email: string) =>
    api.post<PromoteAdminResponse>(`${PREFIX}/promote-user`, { email: email.trim() }),
};
