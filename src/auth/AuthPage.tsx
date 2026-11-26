import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./AuthContext";
import { HOME_BY_ROLE, type AuthUser } from "./types";

type AuthMode = "login" | "register";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function evaluatePasswordStrength(pw: string): {
  level: 0 | 1 | 2 | 3;
  label: string;
} {
  if (!pw) return { level: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (pw.length < 6 || score <= 1) return { level: 1, label: "Yếu" };
  if (score <= 3) return { level: 2, label: "Khá" };
  return { level: 3, label: "Mạnh" };
}

function resolvePostAuthDestination(
  authUser: AuthUser,
  fromPath?: string,
): string {
  if (fromPath && fromPath !== "/login" && fromPath !== "/register") {
    const isAdminUser =
      authUser.role === "ADMIN" || authUser.role === "RECRUITER";
    if (isAdminUser && fromPath.startsWith("/admin")) return fromPath;
    if (authUser.role === "CANDIDATE" && fromPath.startsWith("/app")) {
      return fromPath;
    }
  }
  return HOME_BY_ROLE[authUser.role];
}

export function AuthPage({
  mode = "login",
  onLogin,
  onCandidate,
}: {
  mode?: AuthMode;
  onLogin?: () => void;
  onCandidate?: () => void;
}) {
  const { user, authLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;

  const isRegister = mode === "register";

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Reset transient feedback when toggling between /login and /register
  useEffect(() => {
    setFormError("");
    setFieldErrors({});
    setShowPassword(false);
    setShowConfirm(false);
    setPassword("");
    setConfirmPassword("");
  }, [mode]);

  const strength = useMemo(
    () =>
      isRegister ? evaluatePasswordStrength(password) : { level: 0, label: "" },
    [isRegister, password],
  );

  // Already authenticated → go straight to workspace
  if (!authLoading && user) {
    return <Navigate to={resolvePostAuthDestination(user, fromPath)} replace />;
  }

  const navigateAfterAuth = (authUser: AuthUser) => {
    if (authUser.role === "CANDIDATE" && onCandidate && !fromPath) {
      onCandidate();
      return;
    }
    if (authUser.role !== "CANDIDATE" && onLogin && !fromPath) {
      onLogin();
      return;
    }
    navigate(resolvePostAuthDestination(authUser, fromPath), { replace: true });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const errors: FieldErrors = {};
    if (!identifier.trim()) {
      errors.email = "Vui lòng nhập email hoặc tên đăng nhập.";
    }
    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const authUser = await login(identifier.trim(), password);
      navigateAfterAuth(authUser);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Tên đăng nhập hoặc mật khẩu không chính xác.";
      setFormError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = "Vui lòng nhập họ và tên.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      errors.email = "Địa chỉ email không đúng định dạng.";
    }
    if (password.length < 6) {
      errors.password = "Mật khẩu cần tối thiểu 6 ký tự.";
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const authUser = await register(email.trim(), password, name.trim());
      navigateAfterAuth(authUser);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tạo tài khoản. Vui lòng thử lại.";
      setFormError(msg);
    } finally {
      setBusy(false);
    }
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (formError) setFormError("");
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#f8f9fa] px-4 py-8 text-zinc-950 sm:px-6">
      {/* Top spacer for vertical balance */}
      <div className="h-4 shrink-0" aria-hidden="true" />

      <main className="mx-auto w-full max-w-[400px]">
        {/* Brand mark */}
        <div className="mb-7 flex justify-center">
          <BrandLogo size="md" />
        </div>

        {/* Focused Editorial Auth Card */}
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-16px_rgba(0,0,0,0.07)] sm:p-8">
          <div className="mb-6">
            <h1 className="m-0 text-[21px] font-semibold leading-tight tracking-[-0.02em] text-zinc-950">
              {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
            </h1>
            <p className="mt-1.5 mb-0 text-[13.5px] leading-relaxed text-zinc-500">
              {isRegister
                ? "Bắt đầu luyện phỏng vấn theo CV và xem báo cáo đánh giá."
                : "Nhập thông tin tài khoản để tiếp tục."}
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200/90 bg-red-50/75 px-3 py-2.5 text-[13px] leading-snug text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {isRegister ? (
            <form
              onSubmit={handleRegisterSubmit}
              noValidate
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-name"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Họ và tên
                </Label>
                <Input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                  placeholder="Nguyễn Văn A"
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={
                    fieldErrors.name
                      ? "h-10 border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                      : "h-10 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10"
                  }
                />
                {fieldErrors.name && (
                  <p className="m-0 text-[12px] text-red-600">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-reg-email"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Email
                </Label>
                <Input
                  id="auth-reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="ten@email.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={
                    fieldErrors.email
                      ? "h-10 border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                      : "h-10 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10"
                  }
                />
                {fieldErrors.email && (
                  <p className="m-0 text-[12px] text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-reg-password"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="auth-reg-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="Tối thiểu 6 ký tự"
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={
                      fieldErrors.password
                        ? "h-10 pr-10 border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                        : "h-10 pr-10 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 border-0 bg-transparent p-1 text-zinc-400 transition-colors hover:text-zinc-700 cursor-pointer"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map((step) => {
                        const active = strength.level >= step;
                        const tone =
                          strength.level === 1
                            ? "bg-red-400"
                            : strength.level === 2
                              ? "bg-amber-400"
                              : "bg-emerald-500";
                        return (
                          <span
                            key={step}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              active ? tone : "bg-zinc-200"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500">
                      {strength.label}
                    </span>
                  </div>
                )}

                {fieldErrors.password && (
                  <p className="m-0 text-[12px] text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-reg-confirm"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Nhập lại mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="auth-reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError("confirmPassword");
                    }}
                    placeholder="Nhập lại mật khẩu"
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    className={
                      fieldErrors.confirmPassword
                        ? "h-10 pr-10 border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                        : "h-10 pr-10 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 border-0 bg-transparent p-1 text-zinc-400 transition-colors hover:text-zinc-700 cursor-pointer"
                    aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="m-0 text-[12px] text-red-600">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="mt-1 h-10 w-full bg-zinc-950 text-[13.5px] font-medium text-white hover:bg-zinc-800"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang tạo tài khoản…</span>
                  </>
                ) : (
                  <span>Tạo tài khoản</span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-identifier"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Email hoặc tên đăng nhập
                </Label>
                <Input
                  id="auth-identifier"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="Nhập email hoặc tên đăng nhập"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={
                    fieldErrors.email
                      ? "h-10 border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                      : "h-10 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10"
                  }
                />
                {fieldErrors.email && (
                  <p className="m-0 text-[12px] text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="auth-password"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="Nhập mật khẩu"
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={
                      fieldErrors.password
                        ? "h-10 pr-10 border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/15"
                        : "h-10 pr-10 focus-visible:border-zinc-900 focus-visible:ring-zinc-900/10"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 border-0 bg-transparent p-1 text-zinc-400 transition-colors hover:text-zinc-700 cursor-pointer"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="m-0 text-[12px] text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="mt-1 h-10 w-full bg-zinc-950 text-[13.5px] font-medium text-white hover:bg-zinc-800"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang đăng nhập…</span>
                  </>
                ) : (
                  <span>Đăng nhập</span>
                )}
              </Button>
            </form>
          )}
        </section>

        {/* Primary route switch */}
        <p className="mt-5 mb-0 text-center text-[13px] text-zinc-500">
          {isRegister ? (
            <>
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="font-medium text-zinc-950 no-underline hover:underline underline-offset-4"
              >
                Đăng nhập
              </Link>
            </>
          ) : (
            <>
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="font-medium text-zinc-950 no-underline hover:underline underline-offset-4"
              >
                Tạo tài khoản
              </Link>
            </>
          )}
        </p>
      </main>

      <footer className="mt-8 text-center text-[12px] text-zinc-400">
        © 2026 PrepHire
      </footer>
    </div>
  );
}

export function Login({
  onLogin,
  onCandidate,
}: {
  onLogin: () => void;
  onCandidate?: () => void;
}) {
  return <AuthPage mode="login" onLogin={onLogin} onCandidate={onCandidate} />;
}
