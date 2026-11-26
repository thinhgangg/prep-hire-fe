import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { HOME_BY_ROLE, type UserRole } from "./types";

export function RoleGuard({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          Đang xác thực phiên đăng nhập...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }
  return children;
}
