import { getAuthHeaders, notifyUnauthorized } from "./authStorage";
import type { UserRole } from "../auth/types";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export type AdminUserRecord = {
  id: string;
  user_id_num: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  current_role?: string | null;
  location?: string | null;
  created_at?: string | null;
};

export type NotificationRecord = {
  id: number;
  title: string;
  message: string;
  category: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (res.status === 401) notifyUnauthorized();
  if (res.ok) return res.json() as Promise<T>;
  let msg = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body.detail) msg = body.detail;
  } catch {}
  throw new Error(msg);
}

export async function listAdminUsers(params?: {
  role?: string;
  search?: string;
  limit?: number;
}): Promise<{ total: number; users: AdminUserRecord[] }> {
  const qs = new URLSearchParams();
  if (params?.role) qs.set("role", params.role);
  if (params?.search) qs.set("search", params.search);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/v1/auth/users${query}`, {
    headers: getAuthHeaders(),
  });
  return parseJson<{ total: number; users: AdminUserRecord[] }>(res);
}

export async function updateAdminUserRole(
  userId: number,
  role: UserRole,
): Promise<AdminUserRecord> {
  const res = await fetch(`${API_BASE}/api/v1/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ role }),
  });
  return parseJson<AdminUserRecord>(res);
}

export async function createAdminUser(payload: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}): Promise<AdminUserRecord> {
  const res = await fetch(`${API_BASE}/api/v1/auth/users`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return parseJson<AdminUserRecord>(res);
}

export async function listNotifications(): Promise<{
  unread_count: number;
  items: NotificationRecord[];
}> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/notifications`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      notifyUnauthorized();
      return { unread_count: 0, items: [] };
    }
    if (!res.ok) return { unread_count: 0, items: [] };
    return (await res.json()) as {
      unread_count: number;
      items: NotificationRecord[];
    };
  } catch {
    return { unread_count: 0, items: [] };
  }
}

export async function markNotificationRead(id: number): Promise<void> {
  await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
    method: "POST",
    headers: getAuthHeaders(),
  }).catch(() => {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
    method: "POST",
    headers: getAuthHeaders(),
  }).catch(() => {});
}

