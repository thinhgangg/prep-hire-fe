import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthUser, UserRole } from "./types";
import {
  AUTH_ROLE_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  UNAUTHORIZED_EVENT,
  clearAllUserScopedCaches,
  getAuthToken,
} from "../services/authStorage";
import { invalidateSessionsCache } from "../services/interviewApi";
import { invalidateJobOptionsCache } from "../services/jobApi";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

type AuthContextValue = {
  user: AuthUser | null;
  authLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (
    email: string,
    password: string,
    name?: string,
    _ignoredRole?: UserRole,
  ) => Promise<AuthUser>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    current_role?: string;
    location?: string;
    email?: string;
  }) => Promise<AuthUser>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitialUser(): AuthUser | null {
  try {
    const token = getAuthToken();
    // Never restore an unauthenticated cached user without a real JWT token
    if (!token || token.startsWith("mock-token-")) {
      return null;
    }
    const stored =
      sessionStorage.getItem(AUTH_USER_KEY) ||
      localStorage.getItem(AUTH_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as AuthUser;
    return { ...parsed, token };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadInitialUser);
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    const token = getAuthToken();
    return Boolean(token && !token.startsWith("mock-token-") && !loadInitialUser());
  });

  const saveUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    if (u) {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
      sessionStorage.setItem(AUTH_ROLE_KEY, u.role);
      localStorage.setItem(AUTH_ROLE_KEY, u.role);
      const uidStr =
        u.user_id_num !== undefined ? String(u.user_id_num) : u.id;
      sessionStorage.setItem("current_user_id", uidStr);
      localStorage.setItem("current_user_id", uidStr);
      sessionStorage.setItem("current_user_name", u.name);
      localStorage.setItem("current_user_name", u.name);
      if (u.token) {
        sessionStorage.setItem(AUTH_TOKEN_KEY, u.token);
        localStorage.setItem(AUTH_TOKEN_KEY, u.token);
      }
    } else {
      clearAllUserScopedCaches();
      invalidateSessionsCache();
      invalidateJobOptionsCache();
    }
  }, []);

  const logout = useCallback(() => {
    saveUser(null);
  }, [saveUser]);

  // Listen for global 401 unauthorized events from any API client
  useEffect(() => {
    const onUnauthorized = () => {
      saveUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [saveUser]);

  // Verify stored JWT on app mount (reads both sessionStorage and localStorage)
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    if (token.startsWith("mock-token-")) {
      saveUser(null);
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          saveUser(null);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data) return;
        const verifiedUser: AuthUser = {
          id: data.id,
          user_id_num: data.user_id_num,
          username: data.username,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          token,
          avatar: data.avatar,
          phone: data.phone,
          current_role: data.current_role,
          location: data.location,
        };
        saveUser(verifiedUser);
      })
      .catch(() => {
        // Keep existing cached session on transient network error
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [saveUser]);

  const login = async (
    username: string,
    password: string,
  ): Promise<AuthUser> => {
    const trimmedUser = username.trim();
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: trimmedUser, password }),
    });

    if (!res.ok) {
      let errorMsg = "Đăng nhập không thành công";
      try {
        const err = await res.json();
        if (err.detail) errorMsg = err.detail;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    // Clear any leftover caches from a previous user before storing new session
    clearAllUserScopedCaches();
    invalidateSessionsCache();
    invalidateJobOptionsCache();

    const authUser: AuthUser = {
      id: data.user.id,
      user_id_num: data.user.user_id_num,
      username: data.user.username,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role as UserRole,
      token: data.access_token,
      avatar: data.user.avatar,
      phone: data.user.phone,
      current_role: data.user.current_role,
      location: data.user.location,
    };
    saveUser(authUser);
    return authUser;
  };

  const register = async (
    email: string,
    password: string,
    name?: string,
  ): Promise<AuthUser> => {
    const trimmedEmail = email.trim();
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        name: name?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      let errorMsg = "Đăng ký không thành công";
      try {
        const err = await res.json();
        if (err.detail) errorMsg = err.detail;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    clearAllUserScopedCaches();
    invalidateSessionsCache();
    invalidateJobOptionsCache();

    const authUser: AuthUser = {
      id: data.user.id,
      user_id_num: data.user.user_id_num,
      username: data.user.username,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role as UserRole,
      token: data.access_token,
      avatar: data.user.avatar,
      phone: data.user.phone,
      current_role: data.user.current_role,
      location: data.user.location,
    };
    saveUser(authUser);
    return authUser;
  };

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    current_role?: string;
    location?: string;
    email?: string;
  }): Promise<AuthUser> => {
    const token = user?.token || getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/v1/auth/profile`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (res.status === 401) {
      saveUser(null);
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (!res.ok) {
      let errDetail = "Không thể cập nhật hồ sơ";
      try {
        const err = await res.json();
        if (err.detail) errDetail = err.detail;
      } catch {}
      throw new Error(errDetail);
    }

    const updatedUser = await res.json();
    const authUser: AuthUser = {
      id: updatedUser.id,
      user_id_num: updatedUser.user_id_num,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role as UserRole,
      token: token || undefined,
      avatar: updatedUser.avatar,
      phone: updatedUser.phone,
      current_role: updatedUser.current_role,
      location: updatedUser.location,
    };
    saveUser(authUser);
    return authUser;
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<void> => {
    const token = user?.token || getAuthToken();
    const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (res.status === 401) {
      saveUser(null);
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }

    if (!res.ok) {
      let errDetail = "Không thể đổi mật khẩu";
      try {
        const err = await res.json();
        if (err.detail) errDetail = err.detail;
      } catch {}
      throw new Error(errDetail);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        login,
        register,
        updateProfile,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
