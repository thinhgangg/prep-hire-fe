import { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser, UserRole } from "./types";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

type AuthContextValue = {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (
    email: string,
    password: string,
    name?: string,
    role?: UserRole,
  ) => Promise<AuthUser>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    current_role?: string;
    location?: string;
    email?: string;
  }) => Promise<AuthUser>;
  loginAs: (role: UserRole) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fallbackMockUser(username: string): AuthUser {
  const uname = username.trim().toLowerCase();
  if (uname === "admin") {
    return {
      id: "admin-01",
      user_id_num: 0,
      username: "admin",
      name: "Hoàng Nam (Admin)",
      email: "admin@prephire.vn",
      role: "ADMIN",
    };
  }
  if (uname === "recruiter") {
    return {
      id: "recruiter-01",
      user_id_num: 0,
      username: "recruiter",
      name: "Hoàng Nam (Recruiter)",
      email: "recruiter@prephire.vn",
      role: "RECRUITER",
    };
  }
  const match = uname.match(/^user([1-9]|[1-9][0-9]|100)$/);
  const num = match ? parseInt(match[1], 10) : 1;
  return {
    id: `user-${String(num).padStart(3, "0")}`,
    user_id_num: num,
    username: `user${num}`,
    name: `Ứng viên ${num}`,
    email: `user${num}@prephire.vn`,
    role: "CANDIDATE",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored =
        sessionStorage.getItem("prephire-user") ||
        localStorage.getItem("prephire-user");
      if (stored) return JSON.parse(stored);
      const role = (sessionStorage.getItem("prephire-role") ||
        localStorage.getItem("prephire-role")) as UserRole | null;
      if (role === "ADMIN") return fallbackMockUser("admin");
      if (role === "CANDIDATE") return fallbackMockUser("user1");
    } catch {}
    return null;
  });

  const saveUser = (u: AuthUser | null) => {
    setUser(u);
    if (u) {
      sessionStorage.setItem("prephire-user", JSON.stringify(u));
      localStorage.setItem("prephire-user", JSON.stringify(u));
      sessionStorage.setItem("prephire-role", u.role);
      localStorage.setItem("prephire-role", u.role);
      if (u.user_id_num !== undefined) {
        sessionStorage.setItem("current_user_id", String(u.user_id_num));
        localStorage.setItem("current_user_id", String(u.user_id_num));
      } else {
        sessionStorage.setItem("current_user_id", u.id);
        localStorage.setItem("current_user_id", u.id);
      }
      sessionStorage.setItem("current_user_name", u.name);
      localStorage.setItem("current_user_name", u.name);
      if (u.token) {
        sessionStorage.setItem("prephire-token", u.token);
        localStorage.setItem("prephire-token", u.token);
      }
    } else {
      sessionStorage.removeItem("prephire-user");
      localStorage.removeItem("prephire-user");
      sessionStorage.removeItem("prephire-role");
      localStorage.removeItem("prephire-role");
      sessionStorage.removeItem("current_user_id");
      localStorage.removeItem("current_user_id");
      sessionStorage.removeItem("current_user_name");
      localStorage.removeItem("current_user_name");
      sessionStorage.removeItem("prephire-token");
      localStorage.removeItem("prephire-token");
    }
  };

  const login = async (
    username: string,
    password: string,
  ): Promise<AuthUser> => {
    const trimmedUser = username.trim();
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password }),
      });

      if (res.ok) {
        const data = await res.json();
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
      } else {
        let errorMsg = "Đăng nhập không thành công";
        try {
          const err = await res.json();
          if (err.detail) errorMsg = err.detail;
        } catch {}
        throw new Error(errorMsg);
      }
    } catch (netErr: any) {
      // If server unreachable, check fallback for mock user
      if (
        netErr?.message &&
        !netErr.message.includes("fetch") &&
        !netErr.message.includes("network")
      ) {
        throw netErr;
      }
      if (password === "123456") {
        const u = fallbackMockUser(trimmedUser);
        saveUser(u);
        return u;
      }
      throw new Error(
        netErr?.message || "Không thể kết nối đến máy chủ xác thực",
      );
    }
  };

  const register = async (
    email: string,
    password: string,
    name?: string,
    role: UserRole = "CANDIDATE",
  ): Promise<AuthUser> => {
    const trimmedEmail = email.trim();
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          name: name?.trim() || undefined,
          role,
        }),
      });

      if (res.ok) {
        const data = await res.json();
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
      } else {
        let errorMsg = "Đăng ký không thành công";
        try {
          const err = await res.json();
          if (err.detail) errorMsg = err.detail;
        } catch {}
        throw new Error(errorMsg);
      }
    } catch (netErr: any) {
      if (
        netErr?.message &&
        !netErr.message.includes("fetch") &&
        !netErr.message.includes("network")
      ) {
        throw netErr;
      }
      throw new Error(
        netErr?.message || "Không thể kết nối đến máy chủ xác thực",
      );
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem("prephire-token");
    if (token) {
      fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUser((prev) => {
              const updated: AuthUser = {
                id: data.id,
                user_id_num: data.user_id_num,
                username: data.username,
                name: data.name,
                email: data.email,
                role: data.role as UserRole,
                token: token,
                avatar: data.avatar ?? prev?.avatar,
                phone: data.phone ?? prev?.phone,
                current_role: data.current_role ?? prev?.current_role,
                location: data.location ?? prev?.location,
              };
              sessionStorage.setItem("prephire-user", JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  const updateProfile = async (data: {
    name?: string;
    phone?: string;
    current_role?: string;
    location?: string;
    email?: string;
  }): Promise<AuthUser> => {
    const token = user?.token || sessionStorage.getItem("prephire-token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });

      if (res.ok) {
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
      } else {
        let errDetail = "Không thể cập nhật hồ sơ";
        try {
          const err = await res.json();
          if (err.detail) errDetail = err.detail;
        } catch {}
        throw new Error(errDetail);
      }
    } catch (err: any) {
      // Chỉ fallback cục bộ nếu mất kết nối mạng, lỗi nghiệp vụ từ BE phải hiển thị rõ
      const isNetworkError =
        err instanceof TypeError ||
        /fetch|network/i.test(String(err?.message || ""));
      if (isNetworkError && user) {
        const authUser: AuthUser = {
          ...user,
          ...data,
          name: data.name ?? user.name,
          email: data.email ?? user.email,
          phone: data.phone ?? user.phone,
          current_role: data.current_role ?? user.current_role,
          location: data.location ?? user.location,
        };
        saveUser(authUser);
        return authUser;
      }
      throw err;
    }
  };

  const loginAs = (role: UserRole) => {
    const u =
      role === "ADMIN" ? fallbackMockUser("admin") : fallbackMockUser("user1");
    saveUser(u);
  };

  const logout = () => {
    saveUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, updateProfile, loginAs, logout }}
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
