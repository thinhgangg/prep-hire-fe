import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  Info,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  PageHeader,
  getVietnameseDateEyebrow,
} from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AdminTrafficHistogramCard } from "@/components/dashboard/AdminTrafficHistogramCard";
import { QualityDonutCard } from "@/components/dashboard/QualityDonutCard";
import { RecentSessionsCard } from "@/components/dashboard/RecentSessionsCard";
import { VacanciesCard } from "@/components/dashboard/VacanciesCard";
import {
  buildQualityDonutData,
  buildScoreHistogramData,
  evaluateSessions,
  fillMissingDates,
  filterSessionsByDateRange,
  toLocalIsoDate,
} from "@/utils/dashboardMetrics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchRealJobs, getCachedRealJobs, DbJob } from "./services/jobApi";
import {
  saveInterviewSession,
  getAllSessions,
  getCachedAllSessions,
  type InterviewSession,
} from "./services/interviewApi";
import { useAuth } from "./auth/AuthContext";
import {
  AnalysisPage,
  CandidatesPage,
  DeviceCheckPage,
  HelpCenterPage,
  InterviewRoom,
  InterviewsPage,
  JobsPage,
  ProcessingPage,
  ReportPage,
  ReportsPage,
  SettingsPage,
  computeAiEvaluation,
} from "./Pages";

export type Page =
  | "login"
  | "dashboard"
  | "start"
  | "interviews"
  | "candidates"
  | "jobs"
  | "reports"
  | "settings"
  | "help"
  | "analysis"
  | "device"
  | "room"
  | "processing"
  | "report";

export function Login({
  onLogin,
  onCandidate,
}: {
  onLogin: () => void;
  onCandidate?: () => void;
}) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  // Login states
  const [email, setEmail] = useState("user1");
  const [password, setPassword] = useState("123456");

  // Register states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setBusy(true);
    try {
      const authUser = await login(email, password);
      if (authUser.role === "CANDIDATE" && onCandidate) {
        onCandidate();
      } else {
        onLogin();
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Đăng nhập không thành công. Hãy thử tài khoản từ user1 đến user100 (mật khẩu: 123456).",
      );
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regEmail.includes("@") || !regEmail.includes(".")) {
      setError("Địa chỉ email không đúng định dạng.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setBusy(true);
    try {
      const authUser = await register(
        regEmail,
        regPassword,
        regName,
        "CANDIDATE",
      );
      setSuccessMsg("Đăng ký thành công! Đang chuyển hướng...");
      setTimeout(() => {
        if (authUser.role === "CANDIDATE" && onCandidate) {
          onCandidate();
        } else {
          onLogin();
        }
      }, 600);
    } catch (err: any) {
      setError(
        err?.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setBusy(false);
    }
  };

  const demoAccounts = [
    { code: "U1", name: "Ứng viên 1", username: "user1", isAdmin: false },
    { code: "U2", name: "Ứng viên 2", username: "user2", isAdmin: false },
    { code: "U3", name: "Ứng viên 3", username: "user3", isAdmin: false },
    { code: "AD", name: "Quản trị viên", username: "admin", isAdmin: true },
  ];

  return (
    <main className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-12">
      {/* Left Auth Column */}
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:col-span-6 lg:px-16 xl:px-24">
        <div>
          <BrandLogo size="lg" />
        </div>

        <div className="mx-auto my-10 w-full max-w-[420px]">
          {isRegister ? (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                THAM GIA PREPHIRE AI
              </p>
              <h1 className="m-0 text-[30px] font-bold leading-[1.25] tracking-[-0.02em] text-zinc-950">
                Đăng ký tài khoản mới
              </h1>
              <p className="mt-2 mb-6 text-[14px] leading-relaxed text-zinc-500">
                Tạo tài khoản để luyện phỏng vấn trực tiếp theo CV và nhận báo
                cáo đánh giá chi tiết.
              </p>

              <form onSubmit={submitRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Họ và tên</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Địa chỉ Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reg-password">Mật khẩu</Label>
                    <span className="text-[11px] text-zinc-400">
                      Tối thiểu 6 ký tự
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPass ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="h-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 border-0 bg-transparent p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">Xác nhận mật khẩu</Label>
                  <Input
                    id="reg-confirm"
                    type={showPass ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="h-10"
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {successMsg && (
                  <Alert variant="success">
                    <AlertDescription>{successMsg}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="h-10 w-full"
                >
                  {busy ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      Tạo tài khoản <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-[13px] text-zinc-500">
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="border-0 bg-transparent p-0 font-semibold text-zinc-950 underline underline-offset-4 hover:text-emerald-600 cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                CHÀO MỪNG TRỞ LẠI
              </p>
              <h1 className="m-0 text-[30px] font-bold leading-[1.25] tracking-[-0.02em] text-zinc-950">
                Đăng nhập vào PrepHire AI
              </h1>
              <p className="mt-2 mb-6 text-[14px] leading-relaxed text-zinc-500">
                Tiếp tục luyện tập phỏng vấn hoặc quản lý hoạt động đánh giá ứng
                viên của bạn.
              </p>

              <form onSubmit={submitLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Tên đăng nhập hoặc Email</Label>
                  <Input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user1 hoặc admin"
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 border-0 bg-transparent p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                      aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="h-10 w-full"
                >
                  {busy ? (
                    "Đang đăng nhập..."
                  ) : (
                    <>
                      Đăng nhập <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Quick Demo Account Selector */}
              <div className="mt-7 border-t border-zinc-100 pt-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  Tài khoản thử nghiệm nhanh (Mật khẩu: 123456)
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => {
                        setEmail(acc.username);
                        setPassword("123456");
                        setError("");
                      }}
                      className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                    >
                      <span
                        className={
                          acc.isAdmin
                            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-semibold text-white"
                            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-semibold text-emerald-700 border border-emerald-200/70"
                        }
                      >
                        {acc.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-zinc-900">
                          {acc.name}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-400">
                          {acc.username}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span>
                    Hỗ trợ tài khoản mẫu từ{" "}
                    <code className="font-mono text-zinc-700">user1</code> đến{" "}
                    <code className="font-mono text-zinc-700">user100</code>{" "}
                    (mật khẩu{" "}
                    <code className="font-mono text-zinc-700">123456</code>).
                  </span>
                </div>
              </div>

              <p className="mt-6 text-center text-[13px] text-zinc-500">
                Chưa có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="border-0 bg-transparent p-0 font-semibold text-zinc-950 underline underline-offset-4 hover:text-emerald-600 cursor-pointer"
                >
                  Đăng ký miễn phí
                </button>
              </p>
            </>
          )}
        </div>

        <p className="m-0 text-[12px] text-zinc-400">
          © 2026 PrepHire AI · Bảo mật dữ liệu phỏng vấn
        </p>
      </section>

      {/* Right Brand Showcase (Dark Monochrome Zinc-950 + Emerald) */}
      <aside className="hidden flex-col justify-between border-l border-zinc-800 bg-zinc-950 p-12 text-white lg:col-span-6 lg:flex xl:p-16">
        <div>
          <Badge className="border-zinc-800 bg-zinc-900 text-emerald-400">
            NỀN TẢNG PHỎNG VẤN PREPHIRE AI
          </Badge>
        </div>

        <div className="my-auto max-w-[460px]">
          <h2 className="m-0 text-[34px] font-bold leading-[1.2] tracking-[-0.02em] text-white">
            Đánh giá năng lực ứng viên khách quan, dựa trên bằng chứng thực tế.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
            PrepHire AI kết hợp phân tích CV chuyên sâu, hỏi đáp giọng nói thời
            gian thực và theo dõi độ tập trung ánh nhìn để tạo ra báo cáo minh
            bạch.
          </p>

          <div className="mt-8 space-y-3">
            {[
              {
                title: "Câu hỏi cá nhân hóa theo CV & JD",
                desc: "Đối chiếu kỹ năng thực tế trong hồ sơ với yêu cầu công việc để đặt câu hỏi sát thực tế.",
              },
              {
                title: "Chấm điểm minh bạch theo 7 tiêu chí",
                desc: "Tổng hợp bằng chứng trả lời thành điểm số rõ ràng cho từng nhóm năng lực.",
              },
              {
                title: "Giám sát ánh nhìn (MediaPipe Eye Gaze)",
                desc: "Ghi nhận độ tập trung và chụp bằng chứng tự động trực tiếp trên trình duyệt.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-4"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <div>
                  <div className="text-[14px] font-semibold text-zinc-100">
                    {feature.title}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Xử lý ánh nhìn tại trình duyệt · Lưu trữ báo cáo bảo mật</span>
        </div>
      </aside>
    </main>
  );
}

export function Dashboard({ go }: { go: (p: Page) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>(() =>
    getCachedAllSessions(),
  );
  const [loadingSessions, setLoadingSessions] = useState<boolean>(
    () => getCachedAllSessions().length === 0,
  );
  const [jobs, setJobs] = useState<DbJob[]>(() => getCachedRealJobs());

  // Admin date range & chart mode controls
  const [datePreset, setDatePreset] = useState<"all" | "7d" | "30d" | "custom">(
    "all",
  );
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [chartMode, setChartMode] = useState<"daily" | "scores">("daily");

  useEffect(() => {
    fetchRealJobs().then((list) => {
      if (Array.isArray(list)) setJobs(list);
    });

    getAllSessions(100)
      .then((res) => {
        if (Array.isArray(res)) {
          setSessions(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  const applyPreset = (preset: "all" | "7d" | "30d") => {
    setDatePreset(preset);
    if (preset === "all") {
      setFromDate("");
      setToDate("");
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (preset === "7d" ? 6 : 29));
    setFromDate(toLocalIsoDate(start));
    setToDate(toLocalIsoDate(end));
  };

  // Filter & evaluate sessions using typed utils
  const filteredSessions = useMemo(
    () => filterSessionsByDateRange(sessions, fromDate, toDate),
    [sessions, fromDate, toDate],
  );

  const evaluated = useMemo(
    () => evaluateSessions(filteredSessions, (s) => computeAiEvaluation(s)),
    [filteredSessions],
  );

  const candidatesCount = new Set(
    evaluated.map((x) =>
      x.session.user_id != null
        ? `user-${x.session.user_id}`
        : x.candidateName.toLowerCase(),
    ),
  ).size;

  const completedCount = evaluated.filter((x) => x.isCompleted).length;

  const completionRate =
    evaluated.length > 0
      ? Math.round((completedCount / evaluated.length) * 100)
      : 0;

  const scoredItems = evaluated.filter((x) => x.eval.overallScore > 0);
  const scoredList = scoredItems.map((x) => x.eval.overallScore);

  const avgScore =
    scoredList.length > 0
      ? (scoredList.reduce((a, b) => a + b, 0) / scoredList.length).toFixed(1)
      : "--";
  const maxScore = scoredList.length > 0 ? Math.max(...scoredList) : "--";
  const minScore = scoredList.length > 0 ? Math.min(...scoredList) : "--";

  // Stacked Daily Volume (with fillMissingDates) + Score Histogram + Quality Donut
  const dailyData = useMemo(
    () => fillMissingDates(evaluated, fromDate, toDate),
    [evaluated, fromDate, toDate],
  );
  const histogramData = useMemo(
    () => buildScoreHistogramData(evaluated),
    [evaluated],
  );
  const qualityDonut = useMemo(
    () => buildQualityDonutData(evaluated),
    [evaluated],
  );

  // Top 5 Highest Scoring Candidates (Leaderboard)
  const topCandidates = useMemo(() => {
    return [...scoredItems]
      .sort((a, b) => b.eval.overallScore - a.eval.overallScore)
      .slice(0, 5);
  }, [scoredItems]);

  // Top 5 Most Interviewed Job Positions
  const topInterviewedJobs = useMemo(() => {
    const map = new Map<
      string,
      { title: string; count: number; scoreSum: number; scoredCount: number }
    >();
    evaluated.forEach((item) => {
      const key = item.jobTitle.trim() || "Vị trí phỏng vấn";
      const prev = map.get(key) || {
        title: key,
        count: 0,
        scoreSum: 0,
        scoredCount: 0,
      };
      prev.count += 1;
      if (item.eval.overallScore > 0) {
        prev.scoreSum += item.eval.overallScore;
        prev.scoredCount += 1;
      }
      map.set(key, prev);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [evaluated]);

  const maxJobSessions =
    topInterviewedJobs.length > 0 ? topInterviewedJobs[0].count : 1;

  // All filtered rows for sortable + paginated Admin table
  const tableRows = evaluated.map((item, idx) => {
    const s = item.session;
    const pName = item.candidateName;
    const initials =
      pName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase() || "UV";
    const role = item.jobTitle;
    const dateStr = s.created_at
      ? new Date(s.created_at).toLocaleDateString("vi-VN")
      : "Gần đây";
    const isCompleted =
      s.status === "completed" || s.current_stage === "completed";

    return {
      id: s.session_id || String(idx),
      candidateName: pName,
      candidateInitials: initials,
      subMeta: s.session_id ? `#${s.session_id.slice(0, 8)}` : undefined,
      jobTitle: role,
      dateLabel: dateStr,
      timestamp: item.timestamp,
      status: isCompleted ? ("completed" as const) : ("processing" as const),
      statusLabel: isCompleted ? "Hoàn thành" : "Chưa hoàn thành",
      score: item.eval.overallScore > 0 ? item.eval.overallScore : null,
      onSelect: () => {
        saveInterviewSession(s);
        navigate(`/admin/reports/${s.session_id}`);
      },
    };
  });

  const vacancyItems = jobs.slice(0, 6).map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company || "Doanh nghiệp Công nghệ",
    meta: j.location || "Việt Nam",
    actionLabel: "Chi tiết",
    onAction: () => go("jobs"),
  }));

  // Real CSV Export for Admin
  const handleExportCsv = () => {
    const headers = [
      "Session ID",
      "Ứng viên",
      "Vị trí",
      "Ngày tạo",
      "Trạng thái",
      "Điểm AI (/100)",
    ];
    const csvRows = [
      headers.join(","),
      ...evaluated.map((item) => {
        const isCompleted =
          item.session.status === "completed" ||
          item.session.current_stage === "completed";
        const dateStr = item.session.created_at
          ? new Date(item.session.created_at).toLocaleString("vi-VN")
          : "";
        return [
          `"${item.session.session_id}"`,
          `"${item.candidateName.replace(/"/g, '""')}"`,
          `"${item.jobTitle.replace(/"/g, '""')}"`,
          `"${dateStr}"`,
          `"${isCompleted ? "Hoàn thành" : "Chưa hoàn thành"}"`,
          item.eval.overallScore,
        ].join(",");
      }),
    ];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prephire-report-${fromDate || "all"}-${toDate || "now"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasDateFilter = Boolean(fromDate || toDate);

  return (
    <AppShell page="dashboard" go={go}>
      <PageHeader
        eyebrow={getVietnameseDateEyebrow()}
        title={`Chào buổi sáng, ${user?.name || "Quản trị viên"}`}
        description="Trung tâm điều hành tuyển dụng, theo dõi lưu lượng phỏng vấn và chất lượng ứng viên."
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="lg" onClick={handleExportCsv}>
              <Download /> Xuất CSV
            </Button>
            <Button variant="brand" size="lg" onClick={() => go("reports")}>
              <FileText /> Xem báo cáo
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* Admin Date Range & Quick Filter Bar */}
        <Card className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-800 mr-1">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              Khoảng thời gian
            </span>
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "7d", label: "7 ngày qua" },
                { id: "30d", label: "30 ngày qua" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={
                  datePreset === p.id
                    ? "h-8 rounded-full border border-zinc-900 bg-zinc-900 px-3 text-[12px] font-medium text-white cursor-pointer transition-colors"
                    : "h-8 rounded-full border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer transition-colors"
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <label
                htmlFor="admin-from-date"
                className="text-[12px] font-medium text-zinc-500"
              >
                Từ
              </label>
              <input
                id="admin-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setFromDate(e.target.value);
                }}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-[12px] text-zinc-800 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="admin-to-date"
                className="text-[12px] font-medium text-zinc-500"
              >
                Đến
              </label>
              <input
                id="admin-to-date"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setToDate(e.target.value);
                }}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-[12px] text-zinc-800 focus:border-zinc-900 focus:outline-none"
              />
            </div>

            {hasDateFilter && (
              <button
                type="button"
                onClick={() => applyPreset("all")}
                title="Đặt lại bộ lọc ngày"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
              </button>
            )}

            <Badge
              variant="secondary"
              className="rounded-full px-2.5 py-1 text-[11px] tabular-nums"
            >
              {evaluated.length} / {sessions.length} phiên
            </Badge>
          </div>
        </Card>

        {/* Row 1: 4 Executive KPI Stat Cards */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng phiên phỏng vấn"
            value={evaluated.length}
            subtitle={`${completedCount} hoàn thành · ${Math.max(0, evaluated.length - completedCount)} chưa xong`}
            icon={Video}
            onClick={() => go("interviews")}
            actionTitle="Xem danh sách phỏng vấn"
          />
          <KpiCard
            label="Tỷ lệ hoàn thành"
            value={`${completionRate}%`}
            subtitle={`${completedCount} / ${evaluated.length} phiên đã hoàn tất`}
            badgeText={completionRate >= 70 ? "Ổn định" : undefined}
            badgeTone="success"
            icon={CheckCircle2}
            onClick={() => go("interviews")}
            actionTitle="Xem tiến độ phiên"
          />
          <KpiCard
            label="Ứng viên tham gia"
            value={candidatesCount}
            subtitle={
              candidatesCount > 0
                ? `TB ${(evaluated.length / candidatesCount).toFixed(1)} phiên / ứng viên`
                : "Chưa có hồ sơ trong kỳ"
            }
            icon={Users}
            onClick={() => go("candidates")}
            actionTitle="Xem danh sách ứng viên"
          />
          <KpiCard
            label="Điểm AI trung bình"
            value={avgScore}
            subtitle={
              scoredList.length > 0
                ? `Cao nhất ${maxScore} · Thấp nhất ${minScore} (/100)`
                : "Chưa có phiên đã chấm"
            }
            badgeText={
              typeof avgScore === "string" && Number(avgScore) >= 75
                ? "Tốt"
                : undefined
            }
            badgeTone="success"
            icon={Gauge}
            onClick={() => go("reports")}
            actionTitle="Xem báo cáo đánh giá"
          />
        </section>

        {/* Row 2: Stacked Daily Volume / Score Histogram + Quality Donut */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AdminTrafficHistogramCard
              mode={chartMode}
              onModeChange={setChartMode}
              dailyData={dailyData}
              histogramData={histogramData}
              loading={loadingSessions}
              onSelectDate={(iso) => {
                setDatePreset("custom");
                setFromDate(iso);
                setToDate(iso);
              }}
              summaryStats={
                chartMode === "daily"
                  ? [
                      { label: "Tổng phiên kỳ này", value: evaluated.length },
                      {
                        label: "Hoàn thành",
                        value: completedCount,
                      },
                      {
                        label: "Cao nhất / ngày",
                        value:
                          dailyData.length > 0
                            ? Math.max(...dailyData.map((d) => d.total))
                            : 0,
                      },
                    ]
                  : [
                      { label: "Phiên đã chấm", value: scoredList.length },
                      { label: "Điểm TB", value: avgScore },
                      { label: "Điểm cao nhất", value: maxScore },
                    ]
              }
            />
          </div>
          <div className="lg:col-span-5">
            <QualityDonutCard
              title="Phân bổ chất lượng"
              badgeLabel={hasDateFilter ? "Theo bộ lọc" : "Toàn thời gian"}
              totalScored={qualityDonut.totalScored}
              segments={qualityDonut.segments}
              loading={loadingSessions}
            />
          </div>
        </section>

        {/* Row 3: Top Candidates Leaderboard + Most Interviewed Positions */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
                  Ứng viên điểm cao nhất
                </h2>
              </div>
              <button
                type="button"
                onClick={() => go("candidates")}
                className="inline-flex items-center gap-0.5 border-0 bg-transparent p-0 text-[12px] font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Tất cả ứng viên <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {topCandidates.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {topCandidates.map((item, idx) => {
                  const initials =
                    item.candidateName
                      .split(" ")
                      .filter(Boolean)
                      .slice(-2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase() || "UV";
                  const dateStr = item.session.created_at
                    ? new Date(item.session.created_at).toLocaleDateString(
                        "vi-VN",
                      )
                    : "Gần đây";
                  return (
                    <div
                      key={item.session.session_id}
                      onClick={() => {
                        saveInterviewSession(item.session);
                        navigate(`/admin/reports/${item.session.session_id}`);
                      }}
                      className="group flex cursor-pointer items-center justify-between gap-3 py-3 first:pt-1 last:pb-1 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 text-[12px] font-bold text-zinc-400 tabular-nums">
                          #{idx + 1}
                        </span>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-zinc-900 text-[11px] font-semibold text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-zinc-950 group-hover:text-emerald-700 transition-colors">
                            {item.candidateName}
                          </div>
                          <div className="truncate text-[12px] text-zinc-500">
                            {item.jobTitle} · {dateStr}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={
                            item.eval.overallScore >= 80
                              ? "success"
                              : "secondary"
                          }
                          className="rounded-full tabular-nums"
                        >
                          {item.eval.overallScore}/100
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-700 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[150px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-[13px] text-zinc-500">
                Chưa có ứng viên nào được chấm điểm trong khoảng thời gian này.
              </div>
            )}
          </Card>

          <Card className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-zinc-600" />
                <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
                  Vị trí được phỏng vấn nhiều nhất
                </h2>
              </div>
              <span className="text-[12px] font-medium text-zinc-400 tabular-nums">
                Top {topInterviewedJobs.length}
              </span>
            </div>

            {topInterviewedJobs.length > 0 ? (
              <div className="space-y-4">
                {topInterviewedJobs.map((job) => {
                  const pct = Math.max(
                    8,
                    Math.round((job.count / maxJobSessions) * 100),
                  );
                  const jobAvg =
                    job.scoredCount > 0
                      ? Math.round(job.scoreSum / job.scoredCount)
                      : null;
                  return (
                    <div key={job.title} className="group">
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                        <span
                          className="truncate font-medium text-zinc-900"
                          title={job.title}
                        >
                          {job.title}
                        </span>
                        <span className="shrink-0 text-[12px] text-zinc-500 tabular-nums">
                          <b className="font-semibold text-zinc-950">
                            {job.count}
                          </b>{" "}
                          phiên
                          {jobAvg !== null && (
                            <span className="text-zinc-400">
                              {" "}
                              · TB {jobAvg}đ
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-zinc-300 transition-colors duration-200 group-hover:bg-emerald-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[150px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-[13px] text-zinc-500">
                Chưa có dữ liệu vị trí phỏng vấn trong khoảng thời gian này.
              </div>
            )}
          </Card>
        </section>

        {/* Row 4: Full Sortable/Filterable Sessions Table + Open Vacancies */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RecentSessionsCard
              title="Danh sách phiên phỏng vấn"
              rows={tableRows}
              showCandidateColumn
              enableSort
              enableStatusFilter
              pageSize={6}
              itemLabel="phiên phỏng vấn"
              searchPlaceholder="Tìm ứng viên, vị trí..."
              onViewAll={() => go("interviews")}
              emptyMessage="Không có phiên phỏng vấn nào trong khoảng thời gian đã chọn."
            />
          </div>
          <div className="lg:col-span-4">
            <VacanciesCard
              title="Vị trí đang mở"
              items={vacancyItems}
              totalCount={jobs.length}
              onViewAll={() => go("jobs")}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AppShell({
  page,
  go,
  children,
}: {
  page: Page;
  go: (p: Page) => void;
  children: React.ReactNode;
}) {
  return (
    <AppLayout role="admin" activeKey={page} onNavigate={(p) => go(p as Page)}>
      {children}
    </AppLayout>
  );
}

export default function App() {
  const initial = (localStorage.getItem("iv-page") as Page) || "login";
  const [page, setPage] = useState<Page>(initial);
  const go = (p: Page) => {
    setPage(p);
    localStorage.setItem("iv-page", p);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    document.title =
      page === "login"
        ? "Đăng nhập — PrepHire AI"
        : page === "dashboard"
          ? "Tổng quan — PrepHire AI"
          : "Quản trị — PrepHire AI";
  }, [page]);
  if (page === "login") return <Login onLogin={() => go("dashboard")} />;
  if (page === "interviews" || page === "start")
    return <InterviewsPage go={go} />;
  if (page === "candidates") return <CandidatesPage go={go} />;
  if (page === "jobs") return <JobsPage go={go} />;
  if (page === "reports") return <ReportsPage go={go} />;
  if (page === "settings") return <SettingsPage go={go} />;
  if (page === "help") return <HelpCenterPage go={go} />;
  if (page === "analysis") return <AnalysisPage go={go} />;
  if (page === "device") return <DeviceCheckPage go={go} />;
  if (page === "room") return <InterviewRoom go={go} />;
  if (page === "processing") return <ProcessingPage go={go} />;
  if (page === "report") return <ReportPage go={go} />;
  return <Dashboard go={go} />;
}
