import {
  createStoredSession,
  createCustomSession,
  submitInterviewAnswer,
  getEvidenceSummary,
  loadCvAnalysis,
  loadInterviewSession,
  saveInterviewSession,
  getInterviewSessionById,
  getAllSessions,
  getCachedAllSessions,
  getSessionCandidateName,
  getSessionJobTitle,
  INTERVIEW_SESSION_STORAGE_KEY,
  type CvAnalysis,
  type InterviewSession,
  type InterviewTurn,
} from "./services/interviewApi";
import { fetchRealJobs, getCachedRealJobs, DbJob } from "./services/jobApi";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Headphones,
  Lightbulb,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Plus,
  ScanFace,
  Search,
  Settings,
  ShieldCheck,
  Square,
  Star,
  Target,
  TrendingUp,
  UserX,
  Users,
  Video,
  VideoOff,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AppLayout } from "@/components/layout/AppLayout";
import { HelpCenterContent } from "@/components/layout/HelpCenterContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AdminTrafficHistogramCard } from "@/components/dashboard/AdminTrafficHistogramCard";
import { QualityDonutCard } from "@/components/dashboard/QualityDonutCard";
import { RecentSessionsCard } from "@/components/dashboard/RecentSessionsCard";
import {
  buildQualityDonutData,
  buildScoreHistogramData,
  evaluateSessions,
  fillMissingDates,
} from "@/utils/dashboardMetrics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import type { Page } from "./App";
import {
  createSttJob,
  getSttJob,
  checkSttHealth,
  getSttApiBase,
  setCustomSttUrl,
  STT_JOB_STORAGE_KEY,
  STT_RESULT_STORAGE_KEY,
  type SttJob,
  type TranscriptResult,
} from "./services/sttApi";
import {
  clientGazeTracker,
  GAZE_RESULT_STORAGE_KEY,
  type GazeReportResult,
  type GazeEvent,
} from "./services/gazeTracker";
import { speakQuestion, stopQuestionSpeech } from "./services/ttsApi";

type Props = { go: (page: Page) => void; page?: Page };

function Shell({
  page,
  go,
  children,
  wide = false,
}: Props & { children: React.ReactNode; wide?: boolean }) {
  return (
    <AppLayout
      role="admin"
      activeKey={page || "dashboard"}
      onNavigate={(p) => go(p as Page)}
      wide={wide}
    >
      {children}
    </AppLayout>
  );
}

export function InterviewsPage({ go }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const setCurrentPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: false });
  };
  const pageSize = 8;
  const [sessions, setSessions] = useState<InterviewSession[]>(() =>
    getCachedAllSessions(),
  );
  const [loading, setLoading] = useState(
    () => getCachedAllSessions().length === 0,
  );

  useEffect(() => {
    getAllSessions(100)
      .then((res) => {
        if (Array.isArray(res)) {
          setSessions(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const records = sessions.map((s, i) => {
    const evalData = computeAiEvaluation(s);
    const dateStr = s.created_at
      ? new Date(s.created_at).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Gần đây";
    const candidateName = getSessionCandidateName(s);
    const initial =
      candidateName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase() || "UV";
    const role = getSessionJobTitle(s);
    const isCompleted =
      s.status === "completed" || s.current_stage === "completed";
    const status = isCompleted ? "Hoàn thành" : "Chưa hoàn thành";
    return {
      id: s.session_id || `INT-${i + 1}`,
      name: candidateName,
      initial,
      role,
      date: dateStr,
      status,
      score: evalData.overallScore > 0 ? evalData.overallScore : null,
      rawSession: s,
    };
  });

  const filtered = records.filter((p) => {
    const matchFilter = filter === "Tất cả" || p.status === filter;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const completedCount = records.filter(
    (r) => r.status === "Hoàn thành",
  ).length;
  const processingCount = records.filter(
    (r) => r.status === "Chưa hoàn thành",
  ).length;
  const avgScore = (() => {
    const valid = records.map((r) => r.score).filter((x): x is number => !!x);
    return valid.length > 0
      ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
      : "--";
  })();

  return (
    <Shell page="interviews" go={go}>
      <PageHeader
        title="Phỏng vấn"
        description="Quản lý và theo dõi tất cả phiên phỏng vấn ứng viên."
        action={
          <Button variant="outline" size="lg" onClick={() => go("reports")}>
            <FileText /> Xem báo cáo
          </Button>
        }
      />

      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng phiên"
            value={records.length}
            badgeText="Toàn bộ"
            icon={Video}
          />
          <KpiCard
            label="Hoàn thành"
            value={completedCount}
            badgeText={
              records.length > 0
                ? `${Math.round((completedCount / records.length) * 100)}%`
                : "0%"
            }
            badgeTone="success"
            icon={CheckCircle2}
          />
          <KpiCard
            label="Chưa hoàn thành"
            value={processingCount}
            badgeText="Đang bỏ dở"
            badgeTone={processingCount > 0 ? "warning" : "neutral"}
            icon={Clock3}
          />
          <KpiCard
            label="Điểm trung bình"
            value={avgScore}
            badgeText="/100 điểm"
            badgeTone={
              typeof avgScore === "number" && avgScore >= 75
                ? "success"
                : "neutral"
            }
            icon={BarChart3}
          />
        </section>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Tìm ứng viên, vị trí..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-full pl-9"
              />
            </div>

            <Tabs
              value={filter}
              onValueChange={(v) => {
                setFilter(v);
                setCurrentPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
                <TabsTrigger value="Hoàn thành">Hoàn thành</TabsTrigger>
                <TabsTrigger value="Chưa hoàn thành">
                  Chưa hoàn thành
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center text-sm text-zinc-500">
              Đang tải danh sách phiên phỏng vấn...
            </div>
          ) : paginated.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ứng viên</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Điểm AI</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p, i) => (
                  <TableRow
                    key={p.id || i}
                    className="cursor-pointer"
                    onClick={() => {
                      saveInterviewSession(p.rawSession);
                      navigate(`/admin/reports/${p.id}`, {
                        state: {
                          returnTo:
                            safePage > 1
                              ? `/admin/interviews?page=${safePage}`
                              : "/admin/interviews",
                        },
                      });
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-zinc-900 text-xs text-white">
                            {p.initial}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-zinc-950">
                            {p.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-800">
                      {p.role}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                      {p.date}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "Hoàn thành" ? "success" : "warning"
                        }
                        className="rounded-full"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {p.score ? (
                        <span>
                          {p.score}
                          <span className="text-xs font-normal text-zinc-400">
                            /100
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveInterviewSession(p.rawSession);
                          navigate(`/admin/reports/${p.id}`, {
                            state: {
                              returnTo:
                                safePage > 1
                                  ? `/admin/interviews?page=${safePage}`
                                  : "/admin/interviews",
                            },
                          });
                        }}
                      >
                        Xem báo cáo <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center text-sm text-zinc-500">
              {records.length === 0
                ? "Chưa có phiên phỏng vấn nào được ghi nhận."
                : "Không có phiên phỏng vấn nào phù hợp với bộ lọc hiện tại."}
            </div>
          )}

          {filtered.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              itemLabel="phiên phỏng vấn"
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-4 rounded-none border-0 border-t border-zinc-100 bg-transparent px-0 pb-0 pt-4"
            />
          )}
        </Card>
      </div>
    </Shell>
  );
}

export function CandidatesPage({ go }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const setCurrentPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: false });
  };
  const pageSize = 9;
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSessions(100)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const map = new Map<string, any>();
          res.forEach((s) => {
            const name = getSessionCandidateName(s);
            const key =
              s.user_id != null ? `uid-${s.user_id}` : name.toLowerCase();
            if (!map.has(key)) {
              const ep = (s as any).cv_profile_json || {};
              const rawSkills = [
                ...(ep.cv_skills || []).map((sk: any) =>
                  typeof sk === "string" ? sk : sk?.name || "",
                ),
                ...(ep.technical_skills || []),
              ];
              const skills = rawSkills.filter(Boolean).slice(0, 4);
              const evalData = computeAiEvaluation(s);
              map.set(key, {
                key,
                name,
                initial:
                  name
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase() || "UV",
                role: getSessionJobTitle(s),
                skills: skills.length > 0 ? skills : ["Chuyên môn"],
                email:
                  ep.email ||
                  (s.user_id != null
                    ? `user${s.user_id}@prephire.vn`
                    : `${name.toLowerCase().replace(/\s+/g, ".")}@prephire.vn`),
                status:
                  s.status === "completed" || s.current_stage === "completed"
                    ? "Hoàn thành"
                    : "Chưa hoàn thành",
                score: evalData.overallScore,
                sessionCount: 1,
                session: s,
              });
            } else {
              const existing = map.get(key);
              existing.sessionCount += 1;
            }
          });
          setCandidates(Array.from(map.values()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = candidates.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <Shell page="candidates" go={go}>
      <PageHeader
        title="Ứng viên"
        description="Theo dõi hồ sơ và tiến trình đánh giá ứng viên."
      />

      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Tìm theo tên, email hoặc vị trí..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-full bg-white pl-9"
          />
        </div>
        <span className="text-xs font-medium text-zinc-500 tabular-nums">
          {filtered.length} hồ sơ
        </span>
      </div>

      {loading ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Đang tải danh sách ứng viên từ...
        </Card>
      ) : paginated.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((p, i) => (
              <Card
                key={p.key || p.name + i}
                className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-zinc-900 text-sm font-semibold text-white">
                          {p.initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-[15px] font-semibold text-zinc-950">
                          {p.name}
                        </h3>
                        <p className="m-0 mt-0.5 truncate text-[13px] text-zinc-500">
                          {p.role}
                        </p>
                      </div>
                    </div>
                    {p.score > 0 && (
                      <Badge
                        variant="success"
                        className="rounded-full tabular-nums"
                      >
                        {p.score}/100
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.skills.map((x: string) => (
                      <Badge
                        key={x}
                        variant="secondary"
                        className="text-[11px]"
                      >
                        {x}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span className="truncate">{p.email}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                      {p.sessionCount} phiên
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                  <Badge
                    variant={p.status === "Hoàn thành" ? "success" : "warning"}
                    className="rounded-full"
                  >
                    {p.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      saveInterviewSession(p.session);
                      navigate(`/admin/reports/${p.session.session_id}`, {
                        state: {
                          returnTo:
                            safePage > 1
                              ? `/admin/candidates?page=${safePage}`
                              : "/admin/candidates",
                        },
                      });
                    }}
                  >
                    Xem báo cáo <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            itemLabel="ứng viên"
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="m-0 text-[15px] font-semibold text-zinc-900">
            Chưa có hồ sơ ứng viên
          </h3>
          <p className="m-0 mt-1.5 max-w-md text-[13px] text-zinc-500">
            Hồ sơ ứng viên sẽ tự động hiển thị sau khi ứng viên tải lên CV và
            tham gia phỏng vấn.
          </p>
        </Card>
      )}
    </Shell>
  );
}

export function JobsPage({ go }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobList, setJobList] = useState<DbJob[]>(() => getCachedRealJobs());
  const [loading, setLoading] = useState(
    () => getCachedRealJobs().length === 0,
  );
  const [query, setQuery] = useState("");
  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const setCurrentPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: false });
  };
  const pageSize = 9;

  useEffect(() => {
    fetchRealJobs().then((res) => {
      setJobList(res);
      setLoading(false);
    });
  }, []);

  const filtered = jobList.filter(
    (j) =>
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.company.toLowerCase().includes(query.toLowerCase()) ||
      j.location.toLowerCase().includes(query.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <Shell page="jobs" go={go}>
      <PageHeader
        title="Công việc"
        description={`Danh sách vị trí tuyển dụng thực tế đang có`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Tìm kiếm công việc, công ty hoặc địa điểm..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-full bg-white pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Đang tải danh sách công việc...
        </Card>
      ) : paginated.length === 0 ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Không tìm thấy vị trí tuyển dụng nào phù hợp.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((j) => {
              const initials =
                (j.company || j.title)
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((x) => x[0])
                  .join("")
                  .toUpperCase() || "JB";
              const cleanSkills = (j.skills || []).filter(
                (s) => s && s !== "Dữ liệu thực",
              );

              return (
                <Card
                  key={j.id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="m-0 line-clamp-2 text-[14px] font-semibold leading-snug text-zinc-950">
                          {j.title}
                        </h4>
                        <p className="m-0 mt-1 truncate text-xs text-zinc-500">
                          {j.company}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        {j.location}
                      </span>
                      {j.level && (
                        <Badge
                          variant="outline"
                          className="text-[11px] uppercase"
                        >
                          {j.level}
                        </Badge>
                      )}
                    </div>

                    {cleanSkills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cleanSkills.slice(0, 4).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[11px] font-normal"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400">
                    <Badge
                      variant="success"
                      className="rounded-full text-[11px]"
                    >
                      Đang mở
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            itemLabel="vị trí tuyển dụng"
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </Shell>
  );
}

export function ReportsPage({ go }: Props) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>(() =>
    getCachedAllSessions(),
  );
  const [loading, setLoading] = useState<boolean>(
    () => getCachedAllSessions().length === 0,
  );
  const [chartMode, setChartMode] = useState<"daily" | "scores">("scores");

  useEffect(() => {
    getAllSessions(100)
      .then((res) => {
        if (Array.isArray(res)) {
          setSessions(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const evaluated = evaluateSessions(sessions, (s) => computeAiEvaluation(s));

  const validScores = evaluated
    .map((x) => x.eval.overallScore)
    .filter((s) => s > 0);
  const avgScore =
    validScores.length > 0
      ? Math.round(
          validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length,
        )
      : "--";
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : "--";

  const dailyData = fillMissingDates(evaluated);
  const histogramData = buildScoreHistogramData(evaluated);
  const qualityDonut = buildQualityDonutData(evaluated);

  const tableRows = evaluated.map((item, i) => {
    const pName = item.candidateName;
    const initial =
      pName
        .split(" ")
        .filter(Boolean)
        .slice(-2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase() || "UV";
    const role = item.jobTitle;
    const score = item.eval.overallScore;

    return {
      id: item.session.session_id || String(i),
      candidateName: pName,
      candidateInitials: initial,
      subMeta: item.session.session_id
        ? `#${item.session.session_id.slice(0, 8)}`
        : undefined,
      jobTitle: role,
      dateLabel: item.session.created_at
        ? new Date(item.session.created_at).toLocaleDateString("vi-VN")
        : "Gần đây",
      timestamp: item.timestamp,
      score: score > 0 ? score : null,
      status:
        score >= 80
          ? ("completed" as const)
          : score >= 60
            ? ("processing" as const)
            : ("low" as const),
      statusLabel:
        score >= 80
          ? "Phù hợp cao"
          : score >= 60
            ? "Cần xem xét"
            : score > 0
              ? "Chưa phù hợp"
              : "Chưa hoàn thành",
      onSelect: () => {
        saveInterviewSession(item.session);
        navigate(`/admin/reports/${item.session.session_id}`);
      },
    };
  });

  return (
    <Shell page="reports" go={go}>
      <PageHeader
        title="Báo cáo"
        description="Tổng hợp chất lượng ứng viên và hiệu quả tuyển dụng."
        action={
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Download /> Xuất báo cáo
          </Button>
        }
      />

      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AdminTrafficHistogramCard
              mode={chartMode}
              onModeChange={setChartMode}
              dailyData={dailyData}
              histogramData={histogramData}
              loading={loading}
              summaryStats={[
                { label: "Tổng phiên", value: sessions.length },
                { label: "Điểm TB", value: avgScore },
                { label: "Cao nhất", value: maxScore },
              ]}
            />
          </div>
          <div className="lg:col-span-5">
            <QualityDonutCard
              title="Phân bổ đánh giá"
              badgeLabel="Thực tế"
              totalScored={qualityDonut.totalScored}
              segments={qualityDonut.segments}
              loading={loading}
            />
          </div>
        </section>

        <RecentSessionsCard
          title="Danh sách báo cáo chi tiết"
          rows={tableRows}
          showCandidateColumn
          enableSort
          searchPlaceholder="Tìm báo cáo theo ứng viên, vị trí..."
          emptyMessage="Chưa có báo cáo phiên phỏng vấn nào."
          pageSize={8}
          itemLabel="báo cáo"
        />
      </div>
    </Shell>
  );
}

const NOTIFICATION_ITEMS = [
  {
    key: "email_new_report",
    title: "Cho phép thông báo qua email khi có báo cáo mới",
    desc: "Nhận email tự động ngay khi hoàn tất phân tích phiên phỏng vấn.",
    defaultValue: true,
  },
  {
    key: "weekly_digest",
    title: "Tổng hợp báo cáo định kỳ hàng tuần",
    desc: "Gửi bản tóm tắt tiến độ và chỉ số năng lực vào cuối mỗi tuần.",
    defaultValue: true,
  },
  {
    key: "auto_save_history",
    title: "Tự động lưu lịch sử câu hỏi và câu trả lời",
    desc: "Lưu trữ đầy đủ transcript và điểm đánh giá theo từng phiên.",
    defaultValue: true,
  },
  {
    key: "require_device_check",
    title: "Yêu cầu kiểm tra thiết bị trước khi vào phòng phỏng vấn",
    desc: "Luôn mở bước kiểm tra camera, microphone và mạng trước khi bắt đầu.",
    defaultValue: false,
  },
] as const;

export function SettingsFormContent({
  roleLabel = "Quản trị viên",
}: {
  roleLabel?: string;
}) {
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState("Hồ sơ");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentRole, setCurrentRole] = useState(user?.current_role || "");
  const [location, setLocation] = useState(user?.location || "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const prefsStorageKey = `prephire_notif_prefs_${user?.username || "default"}`;
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    NOTIFICATION_ITEMS.forEach((item) => {
      defaults[item.key] = item.defaultValue;
    });
    try {
      const saved = localStorage.getItem(prefsStorageKey);
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCurrentRole(user.current_role || "");
      setLocation(user.location || "");
    }
  }, [user]);

  const initials =
    (name || user?.name || "UV")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(-2)
      .join("")
      .toUpperCase() || "UV";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        current_role: currentRole.trim(),
        location: location.trim(),
      });
      setSuccessMsg("Cập nhật thành công.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePref = (key: string, next: boolean) => {
    setNotifPrefs((prev) => {
      const updated = { ...prev, [key]: next };
      try {
        localStorage.setItem(prefsStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSavePrefs = () => {
    try {
      localStorage.setItem(prefsStorageKey, JSON.stringify(notifPrefs));
    } catch {}
    setSuccessMsg("Đã lưu tùy chọn thông báo.");
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Quản lý thông tin tài khoản và tùy chỉnh không gian làm việc."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="h-fit rounded-2xl border border-zinc-200 bg-white p-3 lg:col-span-3">
          <div className="flex flex-col gap-1">
            {["Hồ sơ", "Thông báo", "Bảo mật"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setSuccessMsg("");
                  setErrorMsg("");
                }}
                className={
                  tab === t
                    ? "flex h-10 w-full items-center rounded-lg border-0 bg-zinc-100 px-3 text-left text-sm font-semibold text-zinc-950 cursor-pointer"
                    : "flex h-10 w-full items-center rounded-lg border-0 bg-transparent px-3 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer"
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-9">
          <div className="border-b border-zinc-100 pb-4">
            <h2 className="m-0 text-lg font-semibold text-zinc-950">{tab}</h2>
            <p className="m-0 mt-1 text-sm text-zinc-500">
              Cập nhật thông tin và thiết lập {tab.toLowerCase()} của bạn.
            </p>
          </div>

          {successMsg && (
            <Alert variant="success" className="mt-4">
              <Check className="h-4 w-4" />
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}
          {errorMsg && (
            <Alert variant="destructive" className="mt-4">
              <X className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {tab === "Hồ sơ" ? (
            <form onSubmit={handleSaveProfile} className="mt-5 space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-zinc-900 text-base font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-zinc-950">
                    {name || user?.name || roleLabel}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {email || user?.email || ""}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-400">
                    Tài khoản:{" "}
                    <b className="text-zinc-600">{user?.username || "—"}</b>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-name">Họ và tên</Label>
                  <Input
                    id="set-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-email">Email</Label>
                  <Input
                    id="set-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@prephire.vn"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-phone">Số điện thoại</Label>
                  <Input
                    id="set-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+84 912 345 678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-role">Vị trí mong muốn</Label>
                  <Input
                    id="set-role"
                    value={currentRole}
                    onChange={(e) => setCurrentRole(e.target.value)}
                    placeholder={
                      roleLabel === "Quản trị viên"
                        ? "VD: Quản trị viên tuyển dụng"
                        : "VD: Frontend Developer"
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="set-location">Khu vực / Địa chỉ</Label>
                  <Input
                    id="set-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: TP. Hồ Chí Minh, Việt Nam"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-zinc-100 pt-5">
                <Button type="submit" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          ) : tab === "Thông báo" ? (
            <div className="mt-5">
              <div className="divide-y divide-zinc-100">
                {NOTIFICATION_ITEMS.map((item) => {
                  const checked = Boolean(notifPrefs[item.key]);
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0 pr-2">
                        <label
                          htmlFor={`notif-${item.key}`}
                          className="block cursor-pointer text-sm font-medium text-zinc-900"
                        >
                          {item.title}
                        </label>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {item.desc}
                        </div>
                      </div>
                      <Switch
                        id={`notif-${item.key}`}
                        aria-label={item.title}
                        checked={checked}
                        onCheckedChange={(next) =>
                          handleTogglePref(item.key, next)
                        }
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end border-t border-zinc-100 pt-5">
                <Button type="button" onClick={handleSavePrefs}>
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
                <div className="text-sm font-semibold text-zinc-950">
                  Bảo mật dữ liệu phỏng vấn
                </div>
                <p className="m-0 mt-1 text-xs leading-relaxed text-zinc-500">
                  Mọi phiên phỏng vấn, bản ghi giọng nói và dữ liệu hướng nhìn
                  MediaPipe được lưu trữ gắn liền với tài khoản đã xác thực JWT.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-4">
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    Trạng thái xác thực
                  </div>
                  <div className="text-xs text-zinc-500">
                    Đang đăng nhập bằng vai trò{" "}
                    <b className="text-zinc-800">{roleLabel}</b>
                  </div>
                </div>
                <Badge variant="success" className="rounded-full">
                  Đang hoạt động
                </Badge>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export function SettingsPage({ go }: Props) {
  return (
    <Shell page="settings" go={go}>
      <SettingsFormContent roleLabel="Quản trị viên" />
    </Shell>
  );
}

export function HelpCenterPage({ go }: Props) {
  return (
    <Shell page="help" go={go}>
      <HelpCenterContent />
    </Shell>
  );
}

function CvAnalysisPanel({ analysis }: { analysis: CvAnalysis }) {
  const profile = analysis.extracted_profile,
    match = analysis.job_match,
    gap = analysis.gap_analysis,
    review = analysis.ai_review;
  const breakdownLabels: Record<string, string> = {
    skillMatch: "Kỹ năng",
    experienceMatch: "Kinh nghiệm",
    levelMatch: "Cấp độ",
    salaryMatch: "Lương",
    locationMatch: "Địa điểm",
    keywordMatch: "Từ khóa",
    titleMatch: "Chức danh",
    atsReadability: "Khả năng đọc ATS",
  };
  return (
    <section className="cv-analysis-result">
      <div className="cv-result-heading">
        <div>
          <Badge variant="success" className="mb-2">
            <FileText className="h-3.5 w-3.5" /> KẾT QUẢ PHÂN TÍCH CV
          </Badge>
          <h2>Mức độ phù hợp với {analysis.job_context.title}</h2>
          <p>
            {review?.summary ||
              "Kết quả được tổng hợp từ hồ sơ ứng viên và yêu cầu công việc."}
          </p>
        </div>
        <div className="cv-match-score">
          <b>{match.score}</b>
          <small>/100</small>
          <span>{review?.verdict || "Điểm phù hợp"}</span>
        </div>
      </div>
      <div className="cv-result-grid">
        <article>
          <h3>Hồ sơ trích xuất</h3>
          <dl>
            <div>
              <dt>Cấp độ</dt>
              <dd>{profile.cv_level}</dd>
            </div>
            <div>
              <dt>Kinh nghiệm</dt>
              <dd>{profile.cv_years_experience} năm</dd>
            </div>
            <div>
              <dt>Chứng chỉ</dt>
              <dd>{profile.cv_certifications.join(", ") || "Chưa xác định"}</dd>
            </div>
          </dl>
          <h4>Kỹ năng trong CV</h4>
          <div className="cv-tags">
            {profile.cv_skills.length ? (
              profile.cv_skills.map((skill) => (
                <span key={skill.name}>
                  {skill.name} · {Math.round(skill.proficiency * 100)}%
                </span>
              ))
            ) : (
              <em>Chưa trích xuất được kỹ năng</em>
            )}
          </div>
        </article>
        <article>
          <h3>Chi tiết mức độ phù hợp</h3>
          <div className="cv-breakdown">
            {Object.entries(match.scoreBreakdownJson)
              .filter(([, value]) => value !== null)
              .map(([key, value]) => (
                <div key={key}>
                  <span>
                    {breakdownLabels[key] || key}
                    <b>{value}%</b>
                  </span>
                  <i>
                    <em
                      style={{
                        width: `${Math.max(0, Math.min(100, Number(value)))}%`,
                      }}
                    ></em>
                  </i>
                </div>
              ))}
          </div>
        </article>
        <article>
          <h3>Kỹ năng phù hợp</h3>
          <div className="cv-tags positive">
            {match.matchedSkills.length ? (
              match.matchedSkills.map((skill) => (
                <span key={skill}>
                  <Check /> {skill}
                </span>
              ))
            ) : (
              <em>Chưa có kỹ năng khớp</em>
            )}
          </div>
          <h4>Kỹ năng còn thiếu</h4>
          <div className="cv-tags warning">
            {match.missingSkills.length ? (
              match.missingSkills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))
            ) : (
              <em>Không có kỹ năng bắt buộc bị thiếu</em>
            )}
          </div>
          <h4>Kỹ năng nên ưu tiên</h4>
          <div className="cv-tags">
            {gap.recommendedSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </article>
        <article>
          <h3>Nhận xét AI</h3>
          <div className="cv-review-columns">
            <div>
              <h4>Điểm mạnh</h4>
              <ul>
                {(review?.strengths || match.matchedSkills).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Điểm cần chú ý</h4>
              <ul>
                {(review?.concerns || match.missingSkills).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          {review?.recommendations?.length ? (
            <>
              <h4>Khuyến nghị</h4>
              <ul>
                {review.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </article>
      </div>
      {analysis.roadmap.phases.length > 0 && (
        <div className="cv-roadmap">
          <div>
            <h3>Roadmap đề xuất</h3>
            <span>
              {analysis.roadmap.total_weeks} tuần ·{" "}
              {analysis.roadmap.difficulty_level}
            </span>
          </div>
          <div>
            {analysis.roadmap.phases.map((phase) => (
              <article key={phase.phase}>
                <b>Giai đoạn {phase.phase}</b>
                <h4>{phase.title}</h4>
                <small>{phase.duration_weeks} tuần</small>
                <p>
                  {phase.skills.map((skill) => skill.skill_name).join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function AnalysisPage({ go }: Props) {
  const [progress, setProgress] = useState(0);
  const [session] = useState<InterviewSession | null>(() =>
    loadInterviewSession(),
  );
  const [analysis] = useState<CvAnalysis | null>(() => loadCvAnalysis());
  useEffect(() => {
    const t = setInterval(() => setProgress((p) => Math.min(p + 2, 100)), 70);
    return () => clearInterval(t);
  }, []);
  const done = progress === 100;
  return (
    <Shell page="analysis" go={go}>
      <PageHeader
        eyebrow={`PHỎNG VẤN #${session?.session_id.slice(0, 8).toUpperCase() || "CHƯA TẠO"}`}
        title="Đang chuẩn bị buổi phỏng vấn"
        description="Hệ thống đang đối chiếu CV với yêu cầu vị trí tuyển dụng."
        backButton={{ onClick: () => go("start"), label: "Quay lại" }}
        showNotifications={false}
        action={
          <Badge variant="outline" className="px-3 py-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Dữ liệu
            được bảo mật
          </Badge>
        }
      />
      <div className="analysis-layout">
        <section className="analysis-main">
          <div className={`ai-orb ${done ? "done" : ""}`}>
            <FileText />
          </div>
          <h2>
            {done
              ? "Câu hỏi đầu tiên đã sẵn sàng"
              : "Đang phân tích hồ sơ ứng viên"}
          </h2>
          <p>
            {done
              ? session?.current_question?.question ||
                "AI đã tạo bộ câu hỏi cá nhân hóa dựa trên CV và yêu cầu công việc."
              : "AI đang đọc CV, đối chiếu yêu cầu công việc và xác định những năng lực cần đánh giá."}
          </p>
          <div className="analysis-progress">
            <i style={{ width: `${progress}%` }}></i>
          </div>
          <span className="progress-label">
            <b>{progress}%</b>
            <small>{done ? "Hoàn tất" : "Đang chuẩn bị giao diện"}</small>
          </span>
          <div className="analysis-steps">
            {[
              "Phân tích CV và kinh nghiệm",
              "Đối chiếu Job Description",
              "Xác định kỹ năng cần đánh giá",
              "Tạo câu hỏi phỏng vấn",
            ].map((x, i) => {
              const threshold = (i + 1) * 25;
              return (
                <div
                  className={
                    progress >= threshold
                      ? "done"
                      : progress >= threshold - 24
                        ? "active"
                        : ""
                  }
                  key={x}
                >
                  <i>{progress >= threshold ? <Check /> : <Circle />}</i>
                  <span>
                    <b>{x}</b>
                    <small>
                      {progress >= threshold
                        ? "Hoàn tất"
                        : progress >= threshold - 24
                          ? "Đang xử lý…"
                          : "Đang chờ"}
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
          {done && session?.current_question && (
            <button
              className="primary analysis-next"
              onClick={() => go("device")}
            >
              Tiếp tục kiểm tra thiết bị <ArrowRight />
            </button>
          )}
        </section>
        <aside className="analysis-side">
          <h3>Thông tin phiên</h3>
          <div className="candidate-summary">
            <span>AI</span>
            <p>
              <b>Phỏng vấn thích ứng</b>
              <small>{session?.current_stage || "Đang chuẩn bị"}</small>
            </p>
          </div>
          <dl>
            <div>
              <dt>Ngôn ngữ</dt>
              <dd>{session?.language === "vi" ? "Tiếng Việt" : "English"}</dd>
            </div>
            <div>
              <dt>Nguồn câu hỏi</dt>
              <dd>
                <span>CV</span>
                <span>JD</span>
                <span>AI Ranker</span>
              </dd>
            </div>
            <div>
              <dt>Cấu trúc dự kiến</dt>
              <dd>{session?.max_questions || 8} câu hỏi</dd>
            </div>
          </dl>
        </aside>
      </div>
      {analysis && <CvAnalysisPanel analysis={analysis} />}
    </Shell>
  );
}

export function DeviceCheckPage({ go }: Props) {
  const { user } = useAuth();
  const session = loadInterviewSession();
  const cvAnalysis = loadCvAnalysis();

  const jobTitle =
    (session as any)?.job_profile_json?.title ||
    cvAnalysis?.job_context?.title ||
    "Vị trí phỏng vấn";
  const candidateName =
    (session as any)?.cv_profile_json?.candidate_name ||
    user?.name ||
    "Ứng viên";

  const initialCamPref =
    sessionStorage.getItem("interview_camera_enabled") !== "false";
  const initialMicPref =
    sessionStorage.getItem("interview_mic_enabled") !== "false";

  const [cameraOn, setCameraOn] = useState(initialCamPref);
  const [micOn, setMicOn] = useState(initialMicPref);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [activeCameraName, setActiveCameraName] = useState("");
  const [activeMicName, setActiveMicName] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState(
    () => sessionStorage.getItem("interview_video_device_id") || "",
  );
  const [selectedAudioId, setSelectedAudioId] = useState(
    () => sessionStorage.getItem("interview_audio_device_id") || "",
  );
  const [micLevel, setMicLevel] = useState(0);
  const [permissionError, setPermissionError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isTogglingRef = useRef(false);

  // Stop ALL video tracks so hardware webcam LED actually extinguishes & browser marks "Recently used"
  const stopAllVideoTracks = () => {
    const tracksToStop: MediaStreamTrack[] = [];
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => {
        tracksToStop.push(t);
        try {
          streamRef.current?.removeTrack(t);
        } catch {}
      });
    }
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getVideoTracks().forEach((t) => {
        tracksToStop.push(t);
      });
    }
    tracksToStop.forEach((t) => {
      try {
        t.stop();
      } catch {}
    });
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    stopAllVideoTracks();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMicLevel(0);
  };

  const startStream = async (
    videoId?: string,
    audioId?: string,
    wantVideo: boolean = cameraOn,
  ) => {
    stopStream();
    setPermissionError("");
    const curReqId = ++reqIdRef.current;

    try {
      const vConstraints = wantVideo
        ? videoId
          ? {
              deviceId: { exact: videoId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
        : false;

      const aConstraints = audioId ? { deviceId: { exact: audioId } } : true;

      const constraints: MediaStreamConstraints = {
        video: vConstraints,
        audio: aConstraints,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        if (wantVideo) {
          console.warn("Dual capture failed, trying audio only:", err);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: aConstraints,
          });
          wantVideo = false;
        } else {
          throw err;
        }
      }

      // If obsolete request or unmounted during async getUserMedia, release everything immediately
      if (curReqId !== reqIdRef.current || !isMountedRef.current) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        return;
      }

      streamRef.current = stream;

      // Video track handling
      const vTrack = stream.getVideoTracks()[0];
      if (vTrack && wantVideo) {
        setCameraActive(true);
        setCameraOn(true);
        sessionStorage.setItem("interview_camera_enabled", "true");
        setActiveCameraName(vTrack.label || "Webcam máy tính");
        if (videoRef.current) {
          videoRef.current.srcObject = new MediaStream([vTrack]);
          try {
            await videoRef.current.play();
          } catch {}
        }
      } else {
        stopAllVideoTracks();
        setCameraActive(false);
        setCameraOn(false);
        sessionStorage.setItem("interview_camera_enabled", "false");
      }

      // Audio track handling
      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) {
        setMicActive(true);
        aTrack.enabled = micOn;
        setActiveMicName(aTrack.label || "Microphone mặc định");

        try {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 128;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!isMountedRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const lvl = Math.min(100, Math.round((avg / 64) * 100));
            setMicLevel(lvl);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        } catch {}
      }

      // Enumerate devices for selector
      if (navigator.mediaDevices.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        if (curReqId === reqIdRef.current && isMountedRef.current) {
          const vDevs = devs.filter((d) => d.kind === "videoinput");
          const aDevs = devs.filter((d) => d.kind === "audioinput");
          setVideoDevices(vDevs);
          setAudioDevices(aDevs);
          if (vTrack && !videoId && vDevs.length > 0) {
            setSelectedVideoId(
              vTrack.getSettings().deviceId || vDevs[0].deviceId,
            );
          }
          if (aTrack && !audioId && aDevs.length > 0) {
            setSelectedAudioId(
              aTrack.getSettings().deviceId || aDevs[0].deviceId,
            );
          }
        }
      }
    } catch (err: any) {
      if (curReqId === reqIdRef.current && isMountedRef.current) {
        console.error("getUserMedia failure:", err);
        setPermissionError(
          "Chưa cấp quyền truy cập Camera hoặc Microphone. Vui lòng nhấn vào biểu tượng ổ khóa/camera trên thanh địa chỉ của trình duyệt để cấp quyền.",
        );
        setCameraActive(false);
        setMicActive(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    startStream(selectedVideoId, selectedAudioId, initialCamPref);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      isMountedRef.current = false;
      stopStream();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Turn camera OFF: instant UI switch + release hardware track
  const turnCameraOff = () => {
    setCameraOn(false);
    sessionStorage.setItem("interview_camera_enabled", "false");
    stopAllVideoTracks();
  };

  // Turn camera ON: instant UI switch + fast acquisition
  const turnCameraOn = async () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setCameraOn(true);
    setCameraActive(true);
    sessionStorage.setItem("interview_camera_enabled", "true");
    setPermissionError("");

    try {
      const vConstraints = selectedVideoId
        ? { deviceId: { exact: selectedVideoId } }
        : true;
      const newVStream = await navigator.mediaDevices.getUserMedia({
        video: vConstraints,
      });
      const newVTrack = newVStream.getVideoTracks()[0];
      if (newVTrack && isMountedRef.current) {
        if (!streamRef.current) {
          streamRef.current = new MediaStream();
        }
        streamRef.current.addTrack(newVTrack);
        setActiveCameraName(newVTrack.label || "Webcam máy tính");

        if (videoRef.current) {
          videoRef.current.srcObject = new MediaStream([newVTrack]);
          try {
            await videoRef.current.play();
          } catch {}
        }
      } else {
        newVStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
      }
    } catch (err) {
      console.error("Cannot restart camera:", err);
      setCameraOn(false);
      setCameraActive(false);
      sessionStorage.setItem("interview_camera_enabled", "false");
      setPermissionError(
        "Không thể bật lại camera. Hãy kiểm tra cài đặt quyền thiết bị.",
      );
    } finally {
      isTogglingRef.current = false;
    }
  };

  const toggleCamera = () => {
    if (cameraOn) {
      turnCameraOff();
    } else {
      turnCameraOn();
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    sessionStorage.setItem("interview_mic_enabled", String(next));
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    if (!next) {
      setMicLevel(0);
    }
  };

  const handleVideoDeviceChange = (deviceId: string) => {
    setSelectedVideoId(deviceId);
    sessionStorage.setItem("interview_video_device_id", deviceId);
    if (cameraOn) {
      startStream(deviceId, selectedAudioId, true);
    }
  };

  const handleAudioDeviceChange = (deviceId: string) => {
    setSelectedAudioId(deviceId);
    sessionStorage.setItem("interview_audio_device_id", deviceId);
    startStream(selectedVideoId, deviceId, cameraOn);
  };

  const handleJoin = () => {
    sessionStorage.setItem("interview_camera_enabled", String(cameraOn));
    sessionStorage.setItem("interview_mic_enabled", String(micOn));
    if (selectedVideoId)
      sessionStorage.setItem("interview_video_device_id", selectedVideoId);
    if (selectedAudioId)
      sessionStorage.setItem("interview_audio_device_id", selectedAudioId);
    stopStream();
    go("room");
  };

  return (
    <div className="meet-page">
      <header className="meet-header">
        <button className="sub-logo" onClick={() => go("dashboard")}>
          <BrandLogo size="sm" />
        </button>
      </header>

      <main className="meet-body">
        {/* Left: Google Meet Style Viewport */}
        <div className="meet-preview-wrapper">
          <div className="meet-viewport">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="meet-video"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                display: "block",
              }}
            />
            {(!cameraActive || !cameraOn) && (
              <div
                className="meet-cam-off"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  background: "#0f172a",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="meet-cam-off-avatar">
                  {candidateName.slice(0, 2).toUpperCase()}
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1" }}>
                  {permissionError
                    ? "Không có tín hiệu camera"
                    : "Camera đang tắt"}
                </p>
              </div>
            )}

            {/* Candidate Tag & Mic Wave in corner */}
            <div className="meet-name-tag" style={{ zIndex: 3 }}>
              <span>{candidateName}</span>
              {micOn && micActive && (
                <div className="meet-mic-visualizer">
                  <span
                    style={{
                      height: `${Math.max(4, Math.min(14, (micLevel / 100) * 14))}px`,
                    }}
                  />
                  <span
                    style={{
                      height: `${Math.max(4, Math.min(18, (micLevel / 100) * 18))}px`,
                    }}
                  />
                  <span
                    style={{
                      height: `${Math.max(4, Math.min(12, (micLevel / 100) * 12))}px`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Meet Controls Bar (Mic, Camera) */}
            <div className="meet-overlay-bottom" style={{ zIndex: 3 }}>
              <div className="meet-controls-pill">
                <button
                  type="button"
                  className={`meet-btn ${!micOn || !micActive ? "off" : ""}`}
                  onClick={toggleMic}
                  title={micOn ? "Tắt micro" : "Bật micro"}
                >
                  {micOn && micActive ? (
                    <Mic size={20} />
                  ) : (
                    <MicOff size={20} />
                  )}
                </button>
                <button
                  type="button"
                  className={`meet-btn ${!cameraOn || !cameraActive ? "off" : ""}`}
                  onClick={toggleCamera}
                  title={cameraOn ? "Tắt camera" : "Bật camera"}
                >
                  {cameraOn && cameraActive ? (
                    <Camera size={20} />
                  ) : (
                    <VideoOff size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Device Selection Dropdowns */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 shrink-0 text-emerald-600" />
              <Select
                value={selectedVideoId || "__default__"}
                onValueChange={(val) =>
                  handleVideoDeviceChange(val === "__default__" ? "" : val)
                }
              >
                <SelectTrigger className="h-9 flex-1 rounded-xl text-[12px]">
                  <SelectValue
                    placeholder={activeCameraName || "Webcam mặc định"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.length > 0 ? (
                    videoDevices.map((d, idx) => (
                      <SelectItem
                        key={d.deviceId || `cam-${idx}`}
                        value={d.deviceId || `__cam_${idx}`}
                      >
                        {d.label ||
                          `Camera (${(d.deviceId || String(idx)).slice(0, 6)}...)`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__default__">
                      {activeCameraName || "Webcam mặc định"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 shrink-0 text-emerald-600" />
              <Select
                value={selectedAudioId || "__default__"}
                onValueChange={(val) =>
                  handleAudioDeviceChange(val === "__default__" ? "" : val)
                }
              >
                <SelectTrigger className="h-9 flex-1 rounded-xl text-[12px]">
                  <SelectValue
                    placeholder={activeMicName || "Microphone mặc định"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.length > 0 ? (
                    audioDevices.map((d, idx) => (
                      <SelectItem
                        key={d.deviceId || `mic-${idx}`}
                        value={d.deviceId || `__mic_${idx}`}
                      >
                        {d.label ||
                          `Microphone (${(d.deviceId || String(idx)).slice(0, 6)}...)`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__default__">
                      {activeMicName || "Microphone mặc định"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Right: Meeting Info & Live Readiness Card */}
        <div className="meet-right">
          <div className="meet-card">
            <h1>Sẵn sàng tham gia phỏng vấn?</h1>
            <p className="subtitle">
              Đảm bảo hình ảnh rõ nét và không có tạp âm lớn xung quanh trước
              khi vào phòng.
            </p>

            {permissionError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "18px",
                  color: "#dc2626",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                {permissionError}
                <div style={{ marginTop: "8px" }}>
                  <button
                    className="primary"
                    style={{ fontSize: "11px", padding: "6px 12px" }}
                    onClick={() => startStream()}
                  >
                    Thử lại cấp quyền
                  </button>
                </div>
              </div>
            )}

            <div className="meet-session-badge">
              <small>VỊ TRÍ PHỎNG VẤN</small>
              <b>{jobTitle}</b>
            </div>

            <div className="meet-check-list">
              {/* Camera Status */}
              <div className="meet-check-item">
                <i className={cameraActive && cameraOn ? "ok" : "off"}>
                  {cameraActive && cameraOn ? (
                    <Camera size={16} />
                  ) : (
                    <VideoOff size={16} />
                  )}
                </i>
                <div>
                  <b>Camera Webcam</b>
                  <small>
                    {!cameraActive
                      ? "Không tìm thấy camera hoặc bị chặn"
                      : !cameraOn
                        ? "Camera đã tắt"
                        : activeCameraName || "Đang truyền hình ảnh"}
                  </small>
                </div>
                <em className={cameraActive && cameraOn ? "ok" : "off"}>
                  {cameraActive && cameraOn ? (
                    <>
                      <Check size={11} /> Hoạt động
                    </>
                  ) : (
                    "Đã tắt"
                  )}
                </em>
              </div>

              {/* Microphone Status */}
              <div className="meet-check-item">
                <i className={micActive && micOn ? "ok" : "off"}>
                  {micActive && micOn ? (
                    <Mic size={16} />
                  ) : (
                    <MicOff size={16} />
                  )}
                </i>
                <div>
                  <b>Microphone</b>
                  <small>
                    {!micActive
                      ? "Chưa kết nối microphone"
                      : !micOn
                        ? "Microphone đã tắt (Muted)"
                        : micLevel > 5
                          ? "Đang nhận giọng nói tốt"
                          : "Hãy nói thử để kiểm tra âm lượng"}
                  </small>
                </div>
                <em className={micActive && micOn ? "ok" : "off"}>
                  {micActive && micOn ? (
                    micLevel > 5 ? (
                      <>
                        <Check size={11} /> Đang nói
                      </>
                    ) : (
                      <>
                        <Check size={11} /> Tốt
                      </>
                    )
                  ) : (
                    "Đã tắt"
                  )}
                </em>
              </div>

              {/* Network Status */}
              <div className="meet-check-item">
                <i className={isOnline ? "ok" : "off"}>
                  <Wifi size={16} />
                </i>
                <div>
                  <b>Kết nối Internet</b>
                  <small>
                    {isOnline ? "Đường truyền ổn định" : "Mất kết nối mạng"}
                  </small>
                </div>
                <em className={isOnline ? "ok" : "off"}>
                  {isOnline ? (
                    <>
                      <Check size={11} /> Tốt
                    </>
                  ) : (
                    "Mất kết nối"
                  )}
                </em>
              </div>
            </div>

            <button
              type="button"
              className="meet-join-btn"
              onClick={handleJoin}
            >
              <Video size={18} /> Tham gia phỏng vấn ngay
            </button>
            <button
              type="button"
              className="meet-back-btn"
              onClick={() => go("start")}
            >
              Quay lại
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export function InterviewRoom({ go }: Props) {
  const { user } = useAuth();
  const reqIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isTogglingCamRef = useRef(false);

  // Stop ALL video tracks so hardware webcam LED actually extinguishes & browser marks "Recently used"
  const stopAllVideoTracks = () => {
    try {
      clientGazeTracker.stop();
    } catch {}
    const tracksToStop: MediaStreamTrack[] = [];
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        tracksToStop.push(track);
        try {
          streamRef.current?.removeTrack(track);
        } catch {}
      });
    }
    if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getVideoTracks().forEach((track) => {
        tracksToStop.push(track);
      });
    }
    tracksToStop.forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const cleanupMedia = () => {
    try {
      clientGazeTracker.setContext({ sessionId });
      const res = clientGazeTracker.stop();
      if (sessionId) {
        localStorage.setItem(`gaze_result_${sessionId}`, JSON.stringify(res));
      }
    } catch {}
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    stopAllVideoTracks();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopQuestionSpeech();
  };

  const initialCamPref =
    sessionStorage.getItem("interview_camera_enabled") !== "false";
  const initialMicPref =
    sessionStorage.getItem("interview_mic_enabled") !== "false";
  const preferredVideoId = sessionStorage.getItem("interview_video_device_id");
  const preferredAudioId = sessionStorage.getItem("interview_audio_device_id");

  const [mic, setMic] = useState(initialMicPref);
  const [cam, setCam] = useState(initialCamPref);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [secs, setSecs] = useState(0);

  // Live Speech Recognition state (Browser real-time fallback)
  const [liveSpeechText, setLiveSpeechText] = useState("");
  const [sttProvider, setSttProvider] = useState<string>("Đang kiểm tra...");
  const [showSttQuickEdit, setShowSttQuickEdit] = useState(false);
  const [newColabUrl, setNewColabUrl] = useState(() => getSttApiBase());

  // Gaze Tracking State (@mediapipe/tasks-vision client-side)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [gazeStatus, setGazeStatus] = useState<string>(
    "Đang nạp AI theo dõi hướng nhìn...",
  );
  const [gazeType, setGazeType] = useState<
    "normal" | "warning" | "alert" | "calibrating"
  >("normal");

  // AI Interview State
  const [session, setSession] = useState<InterviewSession | null>(() =>
    loadInterviewSession(),
  );
  const [sessionId, setSessionId] = useState(
    () =>
      session?.session_id || sessionStorage.getItem("current_session_id") || "",
  );
  const [questionText, setQuestionText] = useState(
    () =>
      session?.current_question?.question ||
      sessionStorage.getItem("current_question_text") ||
      "",
  );
  const [criterion, setCriterion] = useState(
    () =>
      session?.current_question?.criterion ||
      sessionStorage.getItem("current_question_criterion") ||
      "Kiến thức chuyên môn",
  );
  const [stage, setStage] = useState(
    () =>
      session?.current_question?.stage ||
      session?.current_stage ||
      sessionStorage.getItem("current_question_stage") ||
      "Chuyên môn",
  );
  const [turnIndex, setTurnIndex] = useState(
    () =>
      session?.current_question?.turn_index ??
      parseInt(sessionStorage.getItem("current_turn_index") || "0", 10),
  );
  const [totalQuestions, setTotalQuestions] = useState(
    () =>
      session?.max_questions ??
      parseInt(sessionStorage.getItem("total_questions") || "5", 10),
  );
  const [textAnswer, setTextAnswer] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [inRoomStatus, setInRoomStatus] = useState("");
  const [ttsStatus, setTtsStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  // Check STT backend on mount
  useEffect(() => {
    checkSttHealth().then((h) => {
      if (h.ok) {
        setSttProvider(`Colab GPU (${h.device} • ${h.model})`);
      } else {
        setSttProvider("Web Speech AI (Trình duyệt)");
      }
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    clientGazeTracker.setContext({
      sessionId,
      questionIndex: turnIndex + 1,
      totalQuestions,
      questionText,
      stage,
      activity: recording
        ? "Đang trả lời câu hỏi"
        : ttsStatus === "playing"
          ? "Đang nghe AI đọc câu hỏi"
          : "Đang suy nghĩ trả lời",
    });
  }, [
    sessionId,
    turnIndex,
    totalQuestions,
    questionText,
    stage,
    recording,
    ttsStatus,
  ]);

  useEffect(() => {
    if (!questionText) return;
    let cancelled = false;
    setTtsStatus("loading");
    speakQuestion(questionText, () => {
      if (!cancelled) setTtsStatus("idle");
    })
      .then(() => {
        if (!cancelled) setTtsStatus("playing");
      })
      .catch((error) => {
        if (error?.name !== "AbortError" && !cancelled) {
          console.warn("KorvaTTS unavailable:", error);
          setTtsStatus("error");
        }
      });
    return () => {
      cancelled = true;
      stopQuestionSpeech();
    };
  }, [questionText]);

  // Initialize camera, microphone, and MediaPipe Gaze Tracker directly in browser
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    clientGazeTracker.onStateUpdate = (state) => {
      if (state.status === "CALIBRATING") {
        setGazeStatus(
          `Đang hiệu chuẩn hướng nhìn... ${state.calibrationProgress || 0}%`,
        );
        setGazeType("calibrating");
      } else if (state.status === "LOOKING_STRAIGHT") {
        setGazeStatus("Nhìn thẳng • Bình thường");
        setGazeType("normal");
      } else if (state.status === "LOOKING_AWAY") {
        const dirMap: Record<string, string> = {
          "NHIN TRAI": "trái",
          "NHIN PHAI": "phải",
          "NHIN LEN": "lên trên",
          "NHIN XUONG": "xuống dưới",
        };
        const dirText = state.direction
          ? dirMap[state.direction] || state.direction
          : "lệch hướng";
        setGazeStatus(`Đang nhìn lệch (${dirText})`);
        setGazeType("warning");
      } else if (state.status === "NO_FACE") {
        setGazeStatus("Không phát hiện khuôn mặt");
        setGazeType("alert");
      } else if (state.status === "EYES_CLOSED") {
        setGazeStatus("Mắt nhắm / chớp mắt");
        setGazeType("normal");
      }
    };

    const initMedia = async () => {
      isMountedRef.current = true;
      const curReqId = ++reqIdRef.current;

      try {
        if (!initialCamPref) {
          // Camera was turned off in device check: do not start camera video track
          setCam(false);
          setGazeStatus("Camera đã tắt • Tạm dừng theo dõi");

          const audioConstraints = preferredAudioId
            ? { audio: { deviceId: { exact: preferredAudioId } } }
            : { audio: true };
          const audioStream =
            await navigator.mediaDevices.getUserMedia(audioConstraints);

          if (curReqId !== reqIdRef.current || !isMountedRef.current) {
            audioStream.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
            });
            return;
          }

          activeStream = audioStream;
          streamRef.current = audioStream;
          if (!initialMicPref) {
            audioStream.getAudioTracks().forEach((t) => {
              t.enabled = false;
            });
            setMic(false);
          } else {
            setMic(true);
          }
          return;
        }

        const constraints: MediaStreamConstraints = {
          video: preferredVideoId
            ? { deviceId: { exact: preferredVideoId } }
            : true,
          audio: preferredAudioId
            ? { deviceId: { exact: preferredAudioId } }
            : true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (curReqId !== reqIdRef.current || !isMountedRef.current) {
          stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        activeStream = stream;
        streamRef.current = stream;

        if (!initialMicPref) {
          stream.getAudioTracks().forEach((t) => {
            t.enabled = false;
          });
          setMic(false);
        } else {
          setMic(true);
        }

        const vTrack = stream.getVideoTracks()[0];
        if (vTrack && videoRef.current) {
          videoRef.current.srcObject = new MediaStream([vTrack]);
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn("Video auto-resume note:", e);
          }
        }

        try {
          await clientGazeTracker.initialize();
          if (videoRef.current && isMountedRef.current) {
            clientGazeTracker.start(videoRef.current);
          }
        } catch (gazeErr) {
          console.warn("Gaze initialization note:", gazeErr);
          setGazeStatus("Theo dõi hướng nhìn sẵn sàng");
        }
      } catch (err) {
        if (curReqId !== reqIdRef.current || !isMountedRef.current) return;
        console.warn(
          "Dual media capture fallback, attempting audio-only:",
          err,
        );
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          if (curReqId !== reqIdRef.current || !isMountedRef.current) {
            audioStream.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
            });
            return;
          }
          activeStream = audioStream;
          streamRef.current = audioStream;
          setCam(false);
          setGazeStatus("Chế độ âm thanh (Chỉ sử dụng microphone)");
        } catch (audioErr) {
          console.error("Mic access error:", audioErr);
          setError(
            'Không thể truy cập microphone. Bạn có thể nhấn "Thử lại kết nối Micro" hoặc gõ văn bản.',
          );
        }
      }
    };

    initMedia();

    const handleUnload = () => {
      cleanupMedia();
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("beforeunload", handleUnload);
      cleanupMedia();
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      }
    };
  }, []);

  const retryMicrophone = async () => {
    setError("");
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = audioStream;
      setMic(true);
      setError("");
    } catch (e: any) {
      setError(
        "Vẫn chưa thể truy cập micro. Hãy kiểm tra cài đặt quyền của trình duyệt.",
      );
    }
  };

  const toggleMic = () => {
    const nextMic = !mic;
    setMic(nextMic);
    sessionStorage.setItem("interview_mic_enabled", String(nextMic));
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextMic;
    });
  };

  const toggleCam = async () => {
    if (isTogglingCamRef.current) return;

    if (cam) {
      // Turn camera OFF: instant UI switch + release hardware track
      setCam(false);
      sessionStorage.setItem("interview_camera_enabled", "false");
      setGazeStatus("Camera đã tắt • Tạm dừng theo dõi");
      stopAllVideoTracks();
    } else {
      // Turn camera ON: instant UI switch + fast acquisition
      isTogglingCamRef.current = true;
      setCam(true);
      sessionStorage.setItem("interview_camera_enabled", "true");
      setGazeStatus("Đang mở camera...");

      try {
        const preferredVideoId = sessionStorage.getItem(
          "interview_video_device_id",
        );
        const vConstraints = preferredVideoId
          ? { deviceId: { exact: preferredVideoId } }
          : true;
        const newVStream = await navigator.mediaDevices.getUserMedia({
          video: vConstraints,
        });
        const newTrack = newVStream.getVideoTracks()[0];
        if (newTrack && isMountedRef.current) {
          if (!streamRef.current) {
            streamRef.current = new MediaStream();
          }
          streamRef.current.addTrack(newTrack);

          if (videoRef.current) {
            videoRef.current.srcObject = new MediaStream([newTrack]);
            try {
              await videoRef.current.play();
            } catch {}
          }
          try {
            if (videoRef.current) {
              clientGazeTracker.start(videoRef.current);
            }
          } catch {}
          setGazeStatus("Nhìn thẳng • Bình thường");
        } else {
          newVStream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
        }
      } catch (err) {
        console.error("Cannot turn on camera in room:", err);
        setCam(false);
        sessionStorage.setItem("interview_camera_enabled", "false");
        setGazeStatus("Không thể mở camera");
      } finally {
        isTogglingCamRef.current = false;
      }
    }
  };

  const handleEndInterview = () => {
    cleanupMedia();
    go("report");
  };

  const fmt = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  // Submit Answer to Model 2 (Scorer) & Advance to Next Question (Model 1)
  const handleAnswerSubmission = async (ansText: string) => {
    if (!sessionId) {
      setError("Chưa có mã phiên phỏng vấn để chấm điểm.");
      return;
    }
    setEvaluating(true);
    setInRoomStatus(
      "AI đang đánh giá câu trả lời và chuẩn bị câu tiếp theo...",
    );
    setError("");
    try {
      const result = await submitInterviewAnswer(sessionId, ansText);

      // Extract turn scores
      let turnScores: Record<string, number> = {};
      if (result.turns && result.turns.length > 0) {
        const lastTurn = result.turns[result.turns.length - 1];
        turnScores =
          lastTurn.answer_evidence?.scores ||
          lastTurn.answer_evidence?.applicable_scores ||
          {};
        sessionStorage.setItem(
          "last_turn_scores",
          JSON.stringify(lastTurn.answer_evidence || {}),
        );
        sessionStorage.setItem(
          "last_turn_question",
          lastTurn.question || (lastTurn as any).question_text || questionText,
        );
        sessionStorage.setItem("last_turn_answer", ansText);
      }

      // Save to turn history for report review
      const historyJson = sessionStorage.getItem("interview_turns_history");
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.push({
        turnIndex,
        stage,
        criterion,
        question: questionText,
        answer: ansText,
        scores: turnScores,
      });
      sessionStorage.setItem(
        "interview_turns_history",
        JSON.stringify(history),
      );

      saveInterviewSession(result);
      setSession(result);

      // Check if finished
      if (result.status === "completed" || !result.current_question) {
        cleanupMedia();
        sessionStorage.setItem("interview_completed", "true");
        go("report");
      } else {
        // Move to NEXT question
        const nextQ = result.current_question.question;
        const nextCrit =
          result.current_question.criterion || "Kiến thức chuyên môn";
        const nextStage =
          result.current_question.stage || result.current_stage || "Chuyên môn";
        const nextIdx = result.current_question.turn_index ?? turnIndex + 1;

        setQuestionText(nextQ);
        setCriterion(nextCrit);
        setStage(nextStage);
        setTurnIndex(nextIdx);
        sessionStorage.setItem("current_turn_index", String(nextIdx));
        sessionStorage.setItem("current_question_text", nextQ);
        sessionStorage.setItem("current_question_criterion", nextCrit);
        sessionStorage.setItem("current_question_stage", nextStage);
        setTextAnswer("");
        setLiveSpeechText("");
        liveTranscriptRef.current = "";
        setShowTextInput(false);
      }
    } catch (err: any) {
      console.error("Answer evaluation error:", err);
      setError(
        err.message || "Không thể chấm điểm câu trả lời. Vui lòng thử lại.",
      );
    } finally {
      setEvaluating(false);
      setInRoomStatus("");
    }
  };

  // Voice recording handlers - processes STT seamlessly with Colab GPU + Web Speech fallback
  const startRecording = async () => {
    try {
      setError("");
      chunksRef.current = [];
      setLiveSpeechText("");
      liveTranscriptRef.current = "";

      // 1. Get live audio tracks from existing stream, or request new audio stream
      let audioStream: MediaStream | null = null;
      const liveAudioTracks = streamRef.current
        ?.getAudioTracks()
        .filter((t) => t.readyState === "live");

      if (liveAudioTracks && liveAudioTracks.length > 0) {
        // Ensure unmuted
        liveAudioTracks.forEach((t) => (t.enabled = true));
        setMic(true);
        audioStream = new MediaStream(liveAudioTracks);
      } else {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioStream = newAudioStream;
        setMic(true);
        if (streamRef.current) {
          newAudioStream
            .getAudioTracks()
            .forEach((t) => streamRef.current?.addTrack(t));
        } else {
          streamRef.current = newAudioStream;
        }
      }

      if (!audioStream || audioStream.getAudioTracks().length === 0) {
        throw new Error(
          "Không tìm thấy microphone hoạt động. Hãy kiểm tra kết nối mic.",
        );
      }

      // 2. Select compatible mimeType for MediaRecorder
      let mimeType = "";
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      for (const t of preferred) {
        if (
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported &&
          MediaRecorder.isTypeSupported(t)
        ) {
          mimeType = t;
          break;
        }
      }

      const recorder = new MediaRecorder(
        audioStream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 3. Start Browser Web Speech Recognition concurrently for real-time live captions & offline fallback
      const SpeechRecognition =
        typeof window !== "undefined"
          ? (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition
          : null;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = "vi-VN";
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (e: any) => {
            let combined = "";
            for (let i = 0; i < e.results.length; i++) {
              combined += e.results[i][0].transcript + " ";
            }
            combined = combined.trim();
            if (combined) {
              liveTranscriptRef.current = combined;
              setLiveSpeechText(combined);
            }
          };
          rec.onerror = (e: any) =>
            console.warn("SpeechRecognition warning:", e);
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.warn("SpeechRecognition startup:", e);
        }
      }

      recorder.onstop = async () => {
        // Stop browser speech recognition
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }

        setUploading(true);
        setEvaluating(true);
        setInRoomStatus("Đang xử lý câu trả lời...");
        try {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          let recognizedText = "";

          // First try: Colab GPU / backend STT
          try {
            if (blob.size >= 100) {
              const job = await createSttJob(
                blob,
                `Câu hỏi: ${questionText}. Giai đoạn: ${stage}`,
                sessionId,
                `turn-${turnIndex}`,
              );
              let attempts = 0;
              while (attempts < 40) {
                attempts++;
                await new Promise((r) => setTimeout(r, 700));
                const sttStatus = await getSttJob(job.id);
                if (sttStatus.status === "completed" && sttStatus.result) {
                  recognizedText =
                    sttStatus.result.corrected_transcript ||
                    sttStatus.result.raw_transcript ||
                    "";
                  sessionStorage.setItem(STT_JOB_STORAGE_KEY, job.id);
                  sessionStorage.setItem(
                    STT_RESULT_STORAGE_KEY,
                    JSON.stringify(sttStatus.result),
                  );
                  break;
                }
                if (sttStatus.status === "failed") {
                  throw new Error(sttStatus.error || "Whisper thất bại");
                }
              }
            }
          } catch (sttErr) {
            console.warn(
              "Remote STT worker failed, falling back to Web Speech transcript:",
              sttErr,
            );
          }

          // Fallback: If Colab STT didn't return text, use Web Speech API live transcript
          if (!recognizedText.trim() && liveTranscriptRef.current.trim()) {
            recognizedText = liveTranscriptRef.current.trim();
            console.log(
              "Using Web Speech fallback transcript:",
              recognizedText,
            );
          }

          if (recognizedText && recognizedText.trim().length > 3) {
            setInRoomStatus(
              "AI đang đánh giá câu trả lời và chuẩn bị câu tiếp theo...",
            );
            await handleAnswerSubmission(recognizedText);
          } else {
            throw new Error(
              'Chưa nhận diện được giọng nói rõ ràng. Bạn có thể nhấn "Bắt đầu trả lời" để nói lại hoặc gõ văn bản.',
            );
          }
        } catch (reason: any) {
          console.error("Recording/STT error:", reason);
          setError(
            reason instanceof Error
              ? reason.message
              : "Lỗi xử lý âm thanh. Bạn có thể thử lại hoặc gõ văn bản.",
          );
        } finally {
          setUploading(false);
          setEvaluating(false);
          setInRoomStatus("");
        }
      };

      try {
        recorder.start(1000);
      } catch {
        recorder.start();
      }
      setRecording(true);
    } catch (reason: any) {
      console.error("startRecording error:", reason);
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể kích hoạt ghi âm. Hãy kiểm tra microphone.",
      );
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData();
      } catch {}
      recorder.stop();
      setRecording(false);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  if (!sessionId || !questionText) {
    return (
      <div
        className="room-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
            background: "#1e293b",
            padding: 36,
            borderRadius: 16,
            border: "1px solid #334155",
            color: "#fff",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Video size={26} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            Chưa có phiên phỏng vấn mới
          </h2>
          <p
            style={{
              color: "#94a3b8",
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Vui lòng tải lên CV và chọn công việc từ trang Bắt đầu phỏng vấn để
            AI tạo bộ câu hỏi thích ứng.
          </p>
          <button
            className="primary"
            onClick={() => go("start")}
            style={{ width: "100%", padding: "12px 24px", fontSize: 14 }}
          >
            Tạo phiên phỏng vấn mới <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const cvAnalysis = loadCvAnalysis();
  const jobTitle =
    (session as any)?.job_profile_json?.title ||
    (session as any)?.job_context?.title ||
    cvAnalysis?.job_context?.title ||
    sessionStorage.getItem("selected_job_title") ||
    "Phỏng vấn năng lực AI";

  const candidateName = user?.name || "Ứng viên";

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-header-left">
          <button className="sub-logo" onClick={() => go("dashboard")}>
            <BrandLogo size="sm" />
          </button>
          <div className="room-header-divider" />
          <div className="room-job-badge" title={jobTitle}>
            <BriefcaseBusiness size={14} />
            <span>{jobTitle}</span>
          </div>
        </div>

        <div className="room-progress-wrap">
          <div className="room-progress-info">
            <span>Tiến trình phỏng vấn</span>
            <b>
              Câu {turnIndex + 1} / {totalQuestions}
            </b>
          </div>
          <div className="room-progress-track">
            <div
              className="room-progress-fill"
              style={{
                width: `${Math.min(100, Math.round(((turnIndex + 1) / totalQuestions) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="room-timer-pill">
          <span className="room-timer-dot" />
          <span>{recording ? "Đang ghi âm" : "Thời gian"}</span>
          <b>{fmt}</b>
        </div>
      </header>

      <main className="room-main-stage">
        {/* Left: Candidate Video Card */}
        <section className="room-video-card">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              opacity: cam ? 1 : 0,
            }}
          />

          {!cam && (
            <div className="room-off-cam-stage">
              <div className="room-off-cam-avatar">
                {candidateName.slice(0, 2).toUpperCase()}
              </div>
              <span className="room-off-cam-name">{candidateName}</span>
              <span className="room-off-cam-status">
                {mic
                  ? "Microphone đang bật • Camera đang tắt"
                  : "Camera & Microphone đang tắt"}
              </span>
            </div>
          )}

          {/* Top-left: MediaPipe AI Gaze Pill */}
          <div className={`room-gaze-pill ${gazeType}`}>
            <span className="room-gaze-dot" />
            <span>{gazeStatus}</span>
          </div>

          {/* Bottom-left: Mic muted indicator */}
          {!mic && (
            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: 18,
                zIndex: 5,
                background: "rgba(220, 38, 38, 0.85)",
                backdropFilter: "blur(8px)",
                padding: "6px 10px",
                borderRadius: 8,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                pointerEvents: "none",
              }}
            >
              <MicOff size={14} />
              <span>Đã tắt micro</span>
            </div>
          )}
        </section>

        {/* Right: Question & Answer Card */}
        <aside className="room-qa-card">
          <div className="room-qa-header">
            <div className="room-qa-tags">
              <span className="room-stage-tag">Vòng {stage}</span>
              <span className="room-criterion-tag">Tiêu chí: {criterion}</span>
            </div>
            <div className="room-turn-counter">
              Câu {turnIndex + 1}/{totalQuestions}
            </div>
          </div>

          <div className="room-qa-body">
            <h2 className="room-question-text">{questionText}</h2>

            {/* TTS Audio Controls */}
            <div className="room-tts-bar">
              <button
                type="button"
                className={`room-tts-btn ${ttsStatus === "playing" ? "active" : ""}`}
                onClick={() => {
                  if (ttsStatus === "playing") {
                    stopQuestionSpeech();
                    setTtsStatus("idle");
                  } else {
                    setTtsStatus("loading");
                    speakQuestion(questionText, () => setTtsStatus("idle"))
                      .then(() => setTtsStatus("playing"))
                      .catch(() => setTtsStatus("error"));
                  }
                }}
              >
                <Headphones size={15} />
                <span>
                  {ttsStatus === "playing" ? "Dừng đọc" : "Nghe câu hỏi"}
                </span>
              </button>

              {ttsStatus === "playing" && (
                <span className="room-tts-status">
                  <span className="room-audio-bars">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <Volume2 size={15} />
                  AI đang đọc câu hỏi...
                </span>
              )}
            </div>

            {/* Error banner if microphone issue */}
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "#b91c1c",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span>{error}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={retryMicrophone}
                    style={{
                      background: "#b91c1c",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Thử lại kết nối Micro
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTextInput(true)}
                    style={{
                      background: "transparent",
                      color: "#b91c1c",
                      border: "1px solid #b91c1c",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Chuyển sang gõ văn bản
                  </button>
                </div>
              </div>
            )}

            {/* In-room evaluating banner */}
            {inRoomStatus && (
              <div className="room-eval-status">
                <div className="room-spinner" />
                <span>{inRoomStatus}</span>
              </div>
            )}

            {/* Answer Mode: Text or Voice */}
            {showTextInput ? (
              <div className="room-text-input-wrap">
                <div className="room-text-input-header">
                  <label>Nhập câu trả lời của bạn:</label>
                  <button
                    type="button"
                    className="room-switch-mode-btn"
                    onClick={() => setShowTextInput(false)}
                  >
                    <Mic size={14} /> Chuyển sang trả lời bằng Micro
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Nhập chi tiết câu trả lời của bạn ở đây..."
                  className="room-textarea"
                />
                <button
                  type="button"
                  className="room-submit-text-btn"
                  disabled={evaluating || textAnswer.trim().length < 5}
                  onClick={() => handleAnswerSubmission(textAnswer)}
                >
                  {evaluating
                    ? "AI đang đánh giá câu trả lời..."
                    : "Gửi câu trả lời để chấm điểm"}
                </button>
              </div>
            ) : (
              <div
                className={`room-transcript-card ${recording ? "recording" : ""}`}
              >
                <div className="room-transcript-header">
                  <div className="room-transcript-title">
                    <Mic size={15} />
                    <span>Câu trả lời của bạn</span>
                  </div>
                  <span
                    className={`room-transcript-badge ${recording ? "badge-rec" : ""}`}
                  >
                    {recording
                      ? "Đang ghi âm..."
                      : uploading
                        ? "Đang nhận dạng..."
                        : "Chưa bắt đầu"}
                  </span>
                </div>
                <div className="room-transcript-content">
                  {recording ? (
                    liveSpeechText ? (
                      <p className="room-speech-live">"{liveSpeechText}"</p>
                    ) : (
                      <p className="room-speech-listening">
                        <span className="room-mic-wave" />
                        Hệ thống đang lắng nghe... Hãy nói câu trả lời của bạn
                        vào microphone.
                      </p>
                    )
                  ) : (
                    <p className="room-speech-idle">
                      Nhấn <b>"Bắt đầu trả lời"</b> bên dưới để nói, sau đó nhấn{" "}
                      <b>"Hoàn thành câu trả lời"</b> để nộp cho AI chấm điểm.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="room-qa-footer">
            {!showTextInput &&
              (!recording ? (
                <button
                  className="room-btn-primary room-btn-record"
                  disabled={uploading || evaluating}
                  onClick={startRecording}
                >
                  <Mic size={18} />
                  <span>
                    {uploading || evaluating
                      ? "Đang xử lý…"
                      : "Bắt đầu trả lời"}
                  </span>
                </button>
              ) : (
                <button
                  className="room-btn-danger room-btn-stop"
                  onClick={stopRecording}
                >
                  <Square size={18} />
                  <span>Hoàn thành câu trả lời</span>
                </button>
              ))}

            <div className="room-secondary-actions">
              {!showTextInput && (
                <button
                  type="button"
                  className="room-btn-link"
                  onClick={() => setShowTextInput(true)}
                >
                  Gõ văn bản thay vì nói
                </button>
              )}
              <button
                type="button"
                className="room-btn-link text-muted"
                disabled={uploading || evaluating}
                onClick={() =>
                  handleAnswerSubmission("Tôi xin phép bỏ qua câu hỏi này.")
                }
              >
                Bỏ qua câu hỏi này
              </button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="room-footer">
        <div className="room-footer-security">
          <ShieldCheck size={16} color="#10b981" />
          <span>Phiên phỏng vấn được mã hóa và giám sát tự động bằng AI</span>
        </div>

        <div className="room-footer-controls">
          <button
            type="button"
            className={`room-control-btn ${!mic ? "is-off" : ""}`}
            onClick={toggleMic}
            title={mic ? "Tắt Micro" : "Bật Micro"}
          >
            {mic ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            type="button"
            className={`room-control-btn ${!cam ? "is-off" : ""}`}
            onClick={toggleCam}
            title={cam ? "Tắt Camera" : "Bật Camera"}
          >
            {cam ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        </div>

        <button
          type="button"
          className="room-end-btn"
          disabled={uploading || evaluating}
          onClick={handleEndInterview}
        >
          <X size={18} />
          <span>Kết thúc phỏng vấn</span>
        </button>
      </footer>
    </div>
  );
}

export function ProcessingPage({ go }: Props) {
  const [job, setJob] = useState<SttJob | null>(null),
    [error, setError] = useState(""),
    [advancing, setAdvancing] = useState(false),
    [nextSession, setNextSession] = useState<InterviewSession | null>(null);
  const [sttElapsedMs, setSttElapsedMs] = useState(0);
  const sttStartedAt = useRef(performance.now());
  useEffect(() => {
    if (job?.result || error) return;
    const timer = window.setInterval(
      () => setSttElapsedMs(performance.now() - sttStartedAt.current),
      100,
    );
    return () => window.clearInterval(timer);
  }, [job?.result, error]);
  useEffect(() => {
    const jobId = sessionStorage.getItem(STT_JOB_STORAGE_KEY);
    if (!jobId) {
      setError(
        "Chưa có bản ghi âm. Hãy quay lại phòng phỏng vấn và ghi một câu trả lời.",
      );
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getSttJob(jobId);
        if (cancelled) return;
        setJob(next);
        if (next.status === "completed" && next.result) {
          sessionStorage.setItem(
            STT_RESULT_STORAGE_KEY,
            JSON.stringify(next.result),
          );
          const current = loadInterviewSession();
          if (current) {
            setAdvancing(true);
            const updated = await submitInterviewAnswer(
              current.session_id,
              next.result.corrected_transcript,
            );
            if (cancelled) return;
            saveInterviewSession(updated);
            setNextSession(updated);
            setAdvancing(false);
          }
          return;
        }
        if (next.status === "failed") {
          setError(next.error || "Whisper xử lý thất bại");
          return;
        }
        timer = window.setTimeout(poll, 400);
      } catch (reason) {
        if (!cancelled) {
          setAdvancing(false);
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể xử lý câu trả lời",
          );
        }
      }
    };
    let timer = window.setTimeout(poll, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  const value = job?.progress || 0,
    failed = Boolean(error),
    done = job?.status === "completed" && !advancing && !error;
  const stages = [
    [
      "Audio đã tải lên",
      [
        "queued",
        "loading_model",
        "transcribing",
        "correcting_text",
        "completed",
      ],
    ],
    ["Whisper nhận dạng", ["transcribing", "correcting_text", "completed"]],
    ["Hiệu chỉnh thuật ngữ", ["correcting_text", "completed"]],
    ["Transcript sẵn sàng", ["completed"]],
  ] as const;
  return (
    <div className="processing-page">
      <header>
        <button className="sub-logo" onClick={() => go("dashboard")}>
          <BrandLogo size="sm" />
        </button>
      </header>
      <main>
        <div className="process-orbit">
          <div>
            <Activity />
          </div>
          <i></i>
          <i></i>
          <i></i>
        </div>
        <span className="pill">
          <Activity />{" "}
          {failed
            ? "XỬ LÝ GẶP LỖI"
            : done
              ? "ĐÃ HOÀN TẤT"
              : advancing
                ? "AI ĐANG TẠO CÂU TIẾP THEO"
                : "WHISPER ĐANG XỬ LÝ"}
        </span>
        <h1>
          {failed
            ? "Không thể xử lý câu trả lời"
            : done
              ? "Câu trả lời đã được xử lý"
              : advancing
                ? "Đang đánh giá transcript"
                : "Đang chuyển giọng nói thành văn bản"}
        </h1>
        <p>
          {error ||
            (advancing
              ? "AI đang dùng câu trả lời để tạo câu hỏi phỏng vấn thích ứng tiếp theo."
              : "Audio đang được nhận dạng và hiệu chỉnh thuật ngữ IT bằng datastore đã xác minh.")}
        </p>
        <div className="process-progress">
          <span>
            <i style={{ width: `${value}%` }}></i>
          </span>
          <b>{value}%</b>
        </div>
        <div className="stt-timing">
          <div>
            <small>WHISPER NHẬN DẠNG</small>
            <b>
              {job?.result?.inference_ms != null
                ? `${(job.result.inference_ms / 1000).toFixed(2)} giây`
                : `${(sttElapsedMs / 1000).toFixed(1)} giây`}
            </b>
          </div>
          <div>
            <small>TỔNG XỬ LÝ STT</small>
            <b>
              {job?.result
                ? `${(job.result.latency_ms / 1000).toFixed(2)} giây`
                : "Đang đo…"}
            </b>
          </div>
        </div>
        <div className="process-steps">
          {stages.map(([label, activeStages], i) => {
            const active = job
              ? activeStages.includes(job.stage as never)
              : false;
            const complete =
              done ||
              Boolean(job && stages[i + 1]?.[1].includes(job.stage as never));
            return (
              <div
                className={complete ? "done" : active ? "current" : ""}
                key={label}
              >
                <i>
                  {complete ? <Check /> : active ? <Activity /> : <Circle />}
                </i>
                <span>
                  <b>{label}</b>
                  <small>
                    {complete
                      ? "Hoàn tất"
                      : active
                        ? "Đang xử lý…"
                        : "Đang chờ"}
                  </small>
                </span>
              </div>
            );
          })}
        </div>
        {done && (
          <button
            className="primary process-done"
            onClick={() =>
              go(nextSession?.current_question ? "room" : "report")
            }
          >
            {nextSession?.current_question
              ? "Câu hỏi tiếp theo"
              : "Xem transcript"}{" "}
            <ArrowRight />
          </button>
        )}
        {failed && (
          <button className="primary process-done" onClick={() => go("room")}>
            Quay lại phòng phỏng vấn <ArrowLeft />
          </button>
        )}
        <small>
          Model được load lần đầu có thể mất thêm thời gian. Bạn có thể giữ
          trang này mở.
        </small>
      </main>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-bar">
      <span>
        <b>{label}</b>
        <strong>
          {value}
          <small>/100</small>
        </strong>
      </span>
      <i>
        <em style={{ width: `${value}%` }}></em>
      </i>
    </div>
  );
}
export function ReportPage({ go }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  return (
    <Shell page="report" go={go} wide>
      <div className="candidate-shared-report">
        <ReportContent
          sessionId={id}
          onBack={() => (returnTo ? navigate(returnTo) : go("reports"))}
        />
      </div>
    </Shell>
  );
}

const SCORE_LABELS: Record<string, string> = {
  answer_relevance: "Đúng trọng tâm",
  technical_correctness: "Độ chính xác kỹ thuật",
  expected_signal_coverage: "Mức độ đầy đủ",
  reasoning_quality: "Chất lượng lập luận",
  evidence_quality: "Dẫn chứng thực tế",
  clarity_conciseness: "Rõ ràng, súc tích",
  consistency: "Tính nhất quán",
};
function evidenceScores(turn: InterviewTurn) {
  return (
    turn.answer_evidence?.applicable_scores ||
    turn.answer_evidence?.scores ||
    {}
  );
}
function turnScore(turn: InterviewTurn) {
  const values = Object.values(evidenceScores(turn)).filter((value) =>
    Number.isFinite(value),
  );
  return values.length
    ? Math.round(
        (values.reduce((sum, value) => sum + value, 0) / values.length) * 20,
      )
    : null;
}

// =========================================================================
// AI COMPETENCY AGGREGATION & REPORT ENGINE (5 CORE COMPETENCIES)
// Uses exact formulas from prep-hire-ai/app/services/interview_evidence_aggregation_service.py
// =========================================================================

const NON_ANSWER_PATTERNS = [
  /^(?:dạ\s+|vâng\s+|à\s+|ừm\s+)?(?:tôi|em|mình)?\s*(?:không\s+biết|ko\s+biết|k\s+biết|chưa\s+biết|không\s+rõ|ko\s+rõ|k\s+rõ|chưa\s+rõ|chưa\s+học|chưa\s+tìm\s+hiểu|không\s+nắm\s+được|không\s+trả\s+lời\s+được|chưa\s+tiếp\s+cận|chưa\s+làm|chưa\s+từng\s+làm)(?:\s+(?:ạ|ạ\s*\.|nhiều|rõ|lắm|phần\s+này|câu\s+này|về\s+cái\s+này|về\s+phần\s+này))?[\.\s]*$/i,
  /^(?:dạ\s+|vâng\s+)?(?:xin\s+phép\s+|cho\s+em\s+)?(?:bỏ\s+qua|bo\s+qua|cho\s+qua|qua\s+câu\s+này|bỏ\s+qua\s+câu\s+này)(?:\s+(?:ạ|câu\s+này|ạ\s*\.))?[\.\s]*$/i,
  /^(?:dạ\s+)?(?:tôi|em)?\s*(?:chịu|chịu\s+thôi|chịu\s+ạ|không\s+có\s+câu\s+trả\s+lời)[\.\s]*$/i,
  /^(?:pass|skip|idk|no\s+idea|no\s+answer|next)[\.\s!]*$/i,
  /^[\.\s\?\-,\!_]+$/,
];

const REFUSAL_KEYWORDS = [
  "không biết",
  "ko biết",
  "k biết",
  "chưa biết",
  "không rõ",
  "ko rõ",
  "k rõ",
  "chưa rõ",
  "chưa tìm hiểu",
  "chưa học",
  "chưa tiếp cận",
  "chưa từng làm",
  "chưa làm qua",
  "chưa có kinh nghiệm",
  "không trả lời được",
  "chưa trả lời được",
  "không nắm được",
  "không có câu trả lời",
  "bỏ qua",
  "bo qua",
  "xin phép bỏ qua",
  "cho qua",
  "cho em qua",
  "i don't know",
  "i do not know",
  "no idea",
  "pass",
  "skip",
];

export function isNonAnswer(text: string | null | undefined): boolean {
  if (!text) return true;
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length === 0) return true;
  if (cleaned.length < 3 || /^[\.\s\?\-,\!_]+$/.test(cleaned)) return true;
  for (const pat of NON_ANSWER_PATTERNS) {
    if (pat.test(cleaned)) return true;
  }
  const words = cleaned.split(/\s+/);
  if (words.length <= 18) {
    const hasRefusal = REFUSAL_KEYWORDS.some((k) => cleaned.includes(k));
    if (hasRefusal) {
      const hasContrast = [
        "nhưng",
        "tuy nhiên",
        "song",
        "theo em",
        "em nghĩ",
        "thực ra là",
        "thực tế là",
      ].some((c) => cleaned.includes(c));
      if (!hasContrast) return true;
    }
  }
  return false;
}

export type CompetencyResult = {
  key: string;
  label: string;
  score: number; // 0 - 100%
  level: string;
  desc: string;
};

export type OverallAiEvaluation = {
  candidateName: string;
  jobTitle: string;
  answeredCount: number;
  overallScore: number; // 0 - 100
  confidence: number;
  levelText: string;
  recommendation: string;
  competencies: CompetencyResult[];
  radarPoints: number[];
  strengths: string[];
  improvements: string[];
};

export function computeAiEvaluation(
  session: InterviewSession | null,
  history: any[] = [],
): OverallAiEvaluation {
  const totalExpected =
    session?.max_questions ||
    Math.max(session?.turns?.length || 0, history.length || 0, 5);

  // 1. Gather all turns from session or history
  const sessionTurns = (session?.turns || []).map((t) => ({
    turnIndex: t.turn_index,
    stage: t.stage,
    criterion: t.criterion,
    question: t.question,
    answer: t.answer || "",
    scores: (t.answer_evidence?.scores ||
      t.answer_evidence?.applicable_scores ||
      {}) as Record<string, number>,
  }));

  const rawTurns = sessionTurns.length > 0 ? sessionTurns : history;

  // Count non-answers and valid answers
  let validAnsweredCount = 0;
  let nonAnswerCount = 0;
  let unansweredCount = 0;

  const allProcessedTurns: {
    turnIndex: number;
    scores: Record<string, number>;
    isNonAnswer: boolean;
  }[] = [];

  rawTurns.forEach((t, idx) => {
    const ans = (t.answer || "").trim();
    const isRefusal = isNonAnswer(ans);
    if (!ans) {
      unansweredCount++;
      allProcessedTurns.push({
        turnIndex: t.turnIndex ?? idx,
        scores: {
          answer_relevance: 1.0,
          technical_correctness: 1.0,
          expected_signal_coverage: 1.0,
          reasoning_quality: 1.0,
          evidence_quality: 1.0,
          clarity_conciseness: 1.0,
          consistency: 1.0,
        },
        isNonAnswer: true,
      });
    } else if (isRefusal) {
      nonAnswerCount++;
      allProcessedTurns.push({
        turnIndex: t.turnIndex ?? idx,
        scores: {
          answer_relevance: 1.0,
          technical_correctness: 1.0,
          expected_signal_coverage: 1.0,
          reasoning_quality: 1.0,
          evidence_quality: 1.0,
          clarity_conciseness: 1.0,
          consistency: 1.0,
        },
        isNonAnswer: true,
      });
    } else {
      validAnsweredCount++;
      const sc =
        t.scores && Object.keys(t.scores).length > 0
          ? t.scores
          : {
              answer_relevance: 3.8,
              technical_correctness: 3.8,
              expected_signal_coverage: 3.5,
              reasoning_quality: 3.5,
              evidence_quality: 3.5,
              clarity_conciseness: 4.0,
              consistency: 4.0,
            };
      allProcessedTurns.push({
        turnIndex: t.turnIndex ?? idx,
        scores: sc,
        isNonAnswer: false,
      });
    }
  });

  // Add missing turns if session terminated before max_questions
  const missingTurns = Math.max(0, totalExpected - allProcessedTurns.length);
  unansweredCount += missingTurns;
  for (let m = 0; m < missingTurns; m++) {
    allProcessedTurns.push({
      turnIndex: allProcessedTurns.length + m,
      scores: {
        answer_relevance: 1.0,
        technical_correctness: 1.0,
        expected_signal_coverage: 1.0,
        reasoning_quality: 1.0,
        evidence_quality: 1.0,
        clarity_conciseness: 1.0,
        consistency: 1.0,
      },
      isNonAnswer: true,
    });
  }

  // Retrieve candidate & job context dynamically (prioritize real DB session data!)
  let candidateName = session ? getSessionCandidateName(session) : "";
  let jobTitle = session ? getSessionJobTitle(session) : "";

  if (!session) {
    candidateName = sessionStorage.getItem("selected_cv_name") || "";
    jobTitle = sessionStorage.getItem("selected_job_title") || "";
    try {
      const analysis = loadCvAnalysis();
      if (!jobTitle && analysis?.job_context?.title) {
        jobTitle = analysis.job_context.title;
      }
      if (!candidateName && analysis?.extracted_profile) {
        candidateName = "Ứng viên";
      }
    } catch {}
  }

  if (!candidateName) candidateName = "Ứng viên";
  if (!jobTitle) jobTitle = "Vị trí phỏng vấn";

  // Standard competency signal weights matching prep-hire-ai's InterviewEvidenceAggregator
  const COMPETENCY_SIGNALS: Record<string, Record<string, number>> = {
    technical_knowledge: {
      technical_correctness: 0.4,
      expected_signal_coverage: 0.25,
      reasoning_quality: 0.2,
      answer_relevance: 0.1,
      consistency: 0.05,
    },
    problem_solving: {
      reasoning_quality: 0.35,
      technical_correctness: 0.25,
      expected_signal_coverage: 0.2,
      evidence_quality: 0.1,
      consistency: 0.1,
    },
    experience_evidence: {
      evidence_quality: 0.4,
      expected_signal_coverage: 0.25,
      answer_relevance: 0.15,
      consistency: 0.15,
      clarity_conciseness: 0.05,
    },
    communication: {
      clarity_conciseness: 0.45,
      answer_relevance: 0.3,
      consistency: 0.15,
      expected_signal_coverage: 0.1,
    },
    role_relevance: {
      expected_signal_coverage: 0.4,
      answer_relevance: 0.3,
      evidence_quality: 0.15,
      consistency: 0.15,
    },
  };

  const OVERALL_WEIGHTS: Record<string, number> = {
    technical_knowledge: 0.25,
    problem_solving: 0.25,
    experience_evidence: 0.2,
    communication: 0.15,
    role_relevance: 0.15,
  };

  // Calculate average of each of the 7 criteria across ALL expected turns (penalizing non-answers with 1.0)
  const criterionSum: Record<string, number> = {};
  const criterionCount: Record<string, number> = {};

  allProcessedTurns.forEach((t) => {
    Object.entries(t.scores).forEach(([k, v]) => {
      const val = Number(v);
      if (Number.isFinite(val) && val > 0) {
        criterionSum[k] = (criterionSum[k] || 0) + val;
        criterionCount[k] = (criterionCount[k] || 0) + 1;
      }
    });
  });

  const criterionAvg: Record<string, number> = {};
  Object.keys(criterionSum).forEach((k) => {
    criterionAvg[k] = criterionSum[k] / Math.max(1, criterionCount[k]);
  });
  // If candidate gave 0 valid answers (all skipped or idk), all criterion averages will be 0.0
  const hasValidAnswers = validAnsweredCount > 0;

  // Calculate the 5 Core Competencies
  const compValues: Record<string, number> = {};
  Object.entries(COMPETENCY_SIGNALS).forEach(([compKey, weights]) => {
    let wSum = 0;
    let wTotal = 0;
    Object.entries(weights).forEach(([signalKey, weight]) => {
      const val = criterionAvg[signalKey] ?? (hasValidAnswers ? 4.0 : 0.0);
      wSum += val * weight;
      wTotal += weight;
    });
    compValues[compKey] =
      wTotal > 0 ? wSum / wTotal : hasValidAnswers ? 4.0 : 0.0;
  });

  const competencies: CompetencyResult[] = [
    {
      key: "technical_knowledge",
      label: "Kiến thức chuyên môn & Kỹ thuật",
      score: hasValidAnswers
        ? Math.min(
            100,
            Math.max(
              10,
              Math.round((compValues.technical_knowledge / 5.0) * 100),
            ),
          )
        : 0,
      level: hasValidAnswers
        ? compValues.technical_knowledge >= 4.0
          ? "Thành thạo"
          : compValues.technical_knowledge >= 2.5
            ? "Đạt yêu cầu"
            : "Chưa đạt"
        : "Không đạt (0đ)",
      desc: "Độ chính xác về khái niệm kỹ thuật và kiến trúc hệ thống.",
    },
    {
      key: "problem_solving",
      label: "Kỹ năng giải quyết vấn đề & Tư duy",
      score: hasValidAnswers
        ? Math.min(
            100,
            Math.max(10, Math.round((compValues.problem_solving / 5.0) * 100)),
          )
        : 0,
      level: hasValidAnswers
        ? compValues.problem_solving >= 4.0
          ? "Tư duy logic cao"
          : compValues.problem_solving >= 2.5
            ? "Khá"
            : "Chưa đạt"
        : "Không đạt (0đ)",
      desc: "Chất lượng lập luận, phân tích trade-off và tối ưu giải pháp.",
    },
    {
      key: "experience_evidence",
      label: "Kinh nghiệm thực chiến & Dẫn chứng",
      score: hasValidAnswers
        ? Math.min(
            100,
            Math.max(
              10,
              Math.round((compValues.experience_evidence / 5.0) * 100),
            ),
          )
        : 0,
      level: hasValidAnswers
        ? compValues.experience_evidence >= 4.0
          ? "Thực chứng mạnh mẽ"
          : compValues.experience_evidence >= 2.5
            ? "Cơ bản"
            : "Thiếu dẫn chứng"
        : "Không đạt (0đ)",
      desc: "Dẫn chứng cụ thể từ các dự án thực tế và số liệu triển khai.",
    },
    {
      key: "communication",
      label: "Kỹ năng giao tiếp & Trình bày",
      score: hasValidAnswers
        ? Math.min(
            100,
            Math.max(10, Math.round((compValues.communication / 5.0) * 100)),
          )
        : 0,
      level: hasValidAnswers
        ? compValues.communication >= 4.0
          ? "Mạch lạc, súc tích"
          : compValues.communication >= 2.5
            ? "Đạt yêu cầu"
            : "Cần cải thiện"
        : "Không đạt (0đ)",
      desc: "Cấu trúc câu trả lời rõ ràng, truyền đạt tự tin, có trọng tâm.",
    },
    {
      key: "role_relevance",
      label: "Độ phù hợp công việc & Nhất quán",
      score: hasValidAnswers
        ? Math.min(
            100,
            Math.max(10, Math.round((compValues.role_relevance / 5.0) * 100)),
          )
        : 0,
      level: hasValidAnswers
        ? compValues.role_relevance >= 4.0
          ? "Phù hợp cao với JD"
          : compValues.role_relevance >= 2.5
            ? "Phù hợp"
            : "Chưa phù hợp"
        : "Không đạt (0đ)",
      desc: "Mức độ bám sát yêu cầu công việc và tính trung thực so với CV.",
    },
  ];

  // Calculate Overall Score (Weighted / 100)
  let overallScore = 0;
  if (hasValidAnswers) {
    let overallSum = 0;
    let overallWeight = 0;
    competencies.forEach((c) => {
      const w = OVERALL_WEIGHTS[c.key] || 0.2;
      overallSum += c.score * w;
      overallWeight += w;
    });
    const completionRate = validAnsweredCount / Math.max(1, totalExpected);
    const baseScore = overallSum / overallWeight;
    // Phạt theo tỷ lệ câu hỏi thực chất đã hoàn thành
    overallScore = Math.round(baseScore * completionRate);
  } else {
    // Bỏ qua tất cả câu hỏi: CHẤM 0 ĐIỂM
    overallScore = 0;
  }

  const levelText =
    overallScore >= 80
      ? "Ứng viên phù hợp cao"
      : overallScore >= 65
        ? "Ứng viên tiềm năng"
        : overallScore >= 45
          ? "Cần cải thiện thêm"
          : overallScore > 0
            ? "Chưa đạt yêu cầu"
            : "Không đạt (0 điểm - Bỏ qua toàn bộ câu hỏi)";

  const totalPenalized = nonAnswerCount + unansweredCount;
  const recommendation = !hasValidAnswers
    ? "KHÔNG ĐẠT (0 ĐIỂM) - Ứng viên đã bỏ qua hoặc không trả lời bất kỳ câu hỏi nào trong suốt phiên phỏng vấn."
    : totalPenalized > 0 && overallScore < 65
      ? `Điểm tổng kết bị trừ đáng kể do có ${totalPenalized}/${totalExpected} câu hỏi không trả lời hoặc trả lời không biết.`
      : overallScore >= 75
        ? "Đạt tiêu chuẩn xuất sắc - Đề xuất tiến hành phỏng vấn trực tiếp với Tech Lead / Hiring Manager"
        : overallScore >= 60
          ? "Đạt yêu cầu cơ bản - Cần đào sâu thêm về một số kỹ năng thực tế chuyên sâu"
          : "Chưa đạt tiêu chuẩn yêu cầu - Cần trau dồi thêm kiến thức nền tảng và kinh nghiệm thực chiến";

  const radarPoints = competencies.map((c) => c.score);

  const strengths = hasValidAnswers
    ? [
        `Nắm vững kiến trúc và nền tảng kỹ thuật (${competencies[0].score}/100)`,
        `Khả năng phân tích trade-off và tư duy giải quyết vấn đề mạch lạc (${competencies[1].score}/100)`,
        `Trả lời tự tin, đúng trọng tâm và nhất quán với thông tin trong hồ sơ (${competencies[4].score}/100)`,
      ]
    : [
        "Không có điểm mạnh nào do ứng viên chưa trả lời bất kỳ câu hỏi nào trong buổi phỏng vấn.",
      ];

  const improvements: string[] = [];
  if (!hasValidAnswers) {
    improvements.push(
      "Ứng viên cần tham gia trả lời đầy đủ các câu hỏi phỏng vấn để hệ thống AI có đủ dữ liệu đánh giá năng lực thực tế.",
    );
  } else if (totalPenalized > 0) {
    improvements.push(
      `CẢNH BÁO: Điểm tổng kết đã bị trừ do có ${totalPenalized} câu hỏi chưa trả lời hoặc trả lời "không biết" / bỏ qua (Tỷ lệ hoàn thành: ${Math.round((validAnsweredCount / totalExpected) * 100)}%).`,
    );
  }
  improvements.push(
    "Bổ sung thêm các số liệu định lượng cụ thể (metrics, latency, throughput) trong các bài toán thực tế.",
    "Mở rộng chia sẻ về cách xử lý các trường hợp ngoại lệ (edge cases) và giám sát hệ thống production.",
  );

  const confidence = hasValidAnswers
    ? Math.min(98, Math.round(70 + (validAnsweredCount / totalExpected) * 25))
    : 0;

  return {
    candidateName,
    jobTitle,
    answeredCount: validAnsweredCount,
    overallScore,
    confidence,
    levelText,
    recommendation,
    competencies,
    radarPoints,
    strengths,
    improvements,
  };
}

// Dynamic Radar Chart Polygon Helper
function getRadarPoint(
  cx: number,
  cy: number,
  maxRadius: number,
  scorePercent: number,
  angleDeg: number,
): string {
  const r =
    scorePercent <= 0
      ? 0
      : (maxRadius * Math.max(5, Math.min(100, scorePercent))) / 100;
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function LiveInterviewReport({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<
    "Tổng quan" | "Lịch sử câu trả lời" | "Phân tích hình ảnh (Gaze)"
  >("Tổng quan");
  const [session] = useState<InterviewSession | null>(() =>
    loadInterviewSession(),
  );
  const answered = session?.turns.filter((turn) => turn.answer) || [];

  return (
    <>
      <div className="report-header">
        <div>
          <h1>
            {session?.status === "completed"
              ? "Phỏng vấn đã hoàn tất"
              : "Kết quả hiện tại"}
          </h1>
        </div>
        <p>
          {answered.length} / {session?.max_questions || 0} câu đã trả lời •
          Đánh giá năng lực tự động bằng AI
        </p>
      </div>
      <div className="report-tabs">
        {(
          [
            "Tổng quan",
            "Lịch sử câu trả lời",
            "Phân tích hình ảnh (Gaze)",
          ] as const
        ).map((item) => (
          <button
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Tổng quan" ? (
        <Overview session={session} />
      ) : tab === "Lịch sử câu trả lời" ? (
        <AnswerHistory turns={answered} />
      ) : (
        <VideoReport />
      )}
    </>
  );
}

function AnswerHistory({ turns }: { turns: InterviewTurn[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const turn = turns[selectedIndex];
  if (!turn)
    return (
      <section className="white-card empty-report">
        Chưa có câu trả lời nào trong phiên phỏng vấn.
      </section>
    );
  const scores = evidenceScores(turn);
  const score = turnScore(turn);
  return (
    <div className="question-review">
      <div className="question-nav">
        <h3>Lịch sử câu trả lời</h3>
        {turns.map((item, index) => (
          <button
            className={index === selectedIndex ? "active" : ""}
            key={item.turn_index}
            onClick={() => setSelectedIndex(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>
              <b>{item.stage}</b>
              <small>
                {turnScore(item) === null
                  ? "Chưa có điểm"
                  : `${turnScore(item)}/100`}
              </small>
            </p>
          </button>
        ))}
      </div>
      <article className="white-card answer-detail">
        <span className="pill">
          CÂU HỎI {String(selectedIndex + 1).padStart(2, "0")} •{" "}
          {turn.stage.toUpperCase()}
        </span>
        <h2>{turn.question}</h2>
        <div className="answer-score">
          <span>
            <b>{score ?? "--"}</b>
            <small>/100 điểm</small>
          </span>
          <p>
            <strong>
              {turn.answer_evidence?.status === "success"
                ? "Đã chấm điểm"
                : "Chưa có điểm đánh giá"}
            </strong>
            <em>{turn.answer_scorer_version || "Transcript đã xử lý"}</em>
          </p>
        </div>
        <div className="transcript-answer">
          <h4>CÂU TRẢ LỜI ĐÃ XỬ LÝ</h4>
          <p>"{turn.answer}"</p>
        </div>
        <div className="evaluation">
          <h4>
            <BarChart3 /> 7 TIÊU CHÍ ĐÁNH GIÁ CHUYÊN SÂU
          </h4>
          <div>
            {Object.keys(scores).length ? (
              Object.entries(scores).map(([key, value]) => (
                <span key={key}>
                  <Check /> {SCORE_LABELS[key] || key}:{" "}
                  {(value * 20).toFixed(0)}/100
                </span>
              ))
            ) : (
              <span>Không có dữ liệu điểm chi tiết.</span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

export function ReportContent({
  onBack,
  candidateView = false,
  sessionId,
  session: propSession,
}: {
  onBack: () => void;
  candidateView?: boolean;
  sessionId?: string;
  session?: InterviewSession | null;
}) {
  const [tab, setTab] = useState("Tổng quan");
  const [session, setSession] = useState<InterviewSession | null>(
    () => propSession || loadInterviewSession(sessionId),
  );
  const [loadingSession, setLoadingSession] = useState<boolean>(
    () => !propSession && Boolean(sessionId),
  );

  useEffect(() => {
    if (propSession) {
      setSession(propSession);
      setLoadingSession(false);
      return;
    }
    let cancelled = false;
    if (sessionId && sessionId !== "latest") {
      setLoadingSession(true);
      getInterviewSessionById(sessionId)
        .then((dbSession) => {
          if (!cancelled && dbSession) setSession(dbSession);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoadingSession(false);
        });
    } else if (sessionId === "latest") {
      setLoadingSession(true);
      getAllSessions(1)
        .then((list) => {
          if (!cancelled && Array.isArray(list) && list.length > 0) {
            setSession(list[0]);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoadingSession(false);
        });
    } else {
      setLoadingSession(false);
    }
    return () => {
      cancelled = true;
    };
  }, [sessionId, propSession]);

  if (loadingSession && !session) {
    return (
      <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
        Đang tải dữ liệu báo cáo phỏng vấn...
      </Card>
    );
  }

  const evalData = computeAiEvaluation(session);

  return (
    <>
      <PageHeader
        title={candidateView ? "Kết quả của tôi" : evalData.candidateName}
        description={
          candidateView
            ? `${evalData.candidateName ? `${evalData.candidateName} · ` : ""}${evalData.jobTitle}`
            : `${evalData.jobTitle}`
        }
        showNotifications={false}
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="lg" onClick={() => window.print()}>
              <ArrowDownToLine /> Tải PDF
            </Button>
            {!candidateView && (
              <Button size="lg">
                <Star /> Thêm vào shortlist
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10 bg-white border border-zinc-200 p-1">
            {["Tổng quan", "Đánh giá câu hỏi", "Phân tích hình ảnh"].map(
              (t) => (
                <TabsTrigger key={t} value={t} className="px-4">
                  {t}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </Tabs>
      </div>
      {tab === "Tổng quan" ? (
        <Overview session={session} />
      ) : tab === "Đánh giá câu hỏi" ? (
        <QuestionReview session={session} candidateView={candidateView} />
      ) : (
        <VideoReport sessionId={session?.session_id || sessionId} />
      )}
    </>
  );
}

function Overview({ session }: { session?: InterviewSession | null }) {
  const currentSession = session || loadInterviewSession();
  const isCurrentActiveSession =
    !currentSession?.session_id ||
    currentSession.session_id === sessionStorage.getItem("current_session_id");
  const history: any[] = (() => {
    if (!isCurrentActiveSession) return [];
    try {
      const h = sessionStorage.getItem("interview_turns_history");
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  })();

  // Calculate real AI competencies based on exact AI formula
  const evalData = computeAiEvaluation(currentSession, history);

  // Construct dynamic Radar Polygon (5 points corresponding to the 5 competencies)
  const radarPolygonPoints = evalData.competencies
    .map((c, i) => getRadarPoint(120, 95, 62, c.score, i * 72))
    .join(" ");

  return (
    <>
      <section className="score-hero">
        <div className="overall-ring">
          <span>
            <b>{evalData.overallScore}</b>
            <small>/ 100</small>
          </span>
        </div>
        <div>
          <h2>{evalData.levelText}</h2>
          <p>
            Hồ sơ <b>{evalData.candidateName}</b> đã hoàn thành{" "}
            <b>{evalData.answeredCount}</b> câu hỏi phỏng vấn cho vị trí{" "}
            <b>{evalData.jobTitle}</b>. Hệ thống AI đã tổng hợp dựa trên 5 nhóm
            năng lực cốt lõi.
          </p>
          <div className="recommend">
            <CheckCircle2 />
            <span>
              <b>Đề xuất của AI</b>
              {evalData.recommendation}
            </span>
          </div>
        </div>
        <aside>
          <div>
            <small>SỐ CÂU ĐÃ HỎI</small>
            <b>{evalData.answeredCount} câu</b>
          </div>
          <div>
            <small>ĐỘ TIN CẬY</small>
            <b>{evalData.confidence}%</b>
          </div>
          <div>
            <small>ĐÁNH GIÁ</small>
            <b>Hệ thống AI</b>
          </div>
        </aside>
      </section>

      <div className="report-columns">
        <section className="white-card">
          <div className="card-title">
            <h3>Điểm 5 nhóm năng lực cốt lõi</h3>
            <span>Tính tổng hợp theo trọng số AI từ các câu trả lời</span>
          </div>
          {evalData.competencies.map((comp) => (
            <div key={comp.key} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}
                >
                  {comp.label}
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}
                >
                  {comp.score}
                  <small style={{ fontSize: 10, color: "#64748b" }}>/100</small>
                </span>
              </div>
              <div
                style={{
                  height: 7,
                  width: "100%",
                  background: "#f1f5f9",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${comp.score}%`,
                    background:
                      comp.score >= 80
                        ? "#10b981"
                        : comp.score >= 65
                          ? "#3b82f6"
                          : "#f59e0b",
                    borderRadius: 4,
                    transition: "width 0.6s ease",
                  }}
                ></div>
              </div>
              <small
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  display: "block",
                  marginTop: 3,
                }}
              >
                {comp.desc} • <i>{comp.level}</i>
              </small>
            </div>
          ))}
        </section>

        <section className="white-card">
          <div className="card-title">
            <h3>Bản đồ năng lực (Radar Chart)</h3>
            <span>5 chiều năng lực đánh giá</span>
          </div>
          <div
            className="radar"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <svg viewBox="0 0 240 190" style={{ width: "100%", maxWidth: 300 }}>
              {/* Radar Grid Levels (25%, 50%, 75%, 100%) */}
              <g fill="none" stroke="#e2e8f0" strokeWidth="1">
                <polygon points="120,33 179,76 156,146 84,146 61,76" />
                <polygon points="120,48 164,81 147,133 93,133 76,81" />
                <polygon points="120,64 150,86 138,121 102,121 90,86" />
                <polygon points="120,79 135,90 129,108 111,108 105,90" />
                {/* Spokes from center to 5 outer vertices */}
                <line x1="120" y1="95" x2="120" y2="33" />
                <line x1="120" y1="95" x2="179" y2="76" />
                <line x1="120" y1="95" x2="156" y2="146" />
                <line x1="120" y1="95" x2="84" y2="146" />
                <line x1="120" y1="95" x2="61" y2="76" />
              </g>

              {/* Dynamic Radar Area based on real calculated scores */}
              <polygon
                points={radarPolygonPoints}
                fill="rgba(16, 185, 129, 0.25)"
                stroke="#10b981"
                strokeWidth="2"
              />

              {/* Vertex dots */}
              {evalData.competencies.map((c, i) => {
                const pt = getRadarPoint(120, 95, 62, c.score, i * 72).split(
                  ",",
                );
                return (
                  <circle
                    key={c.key}
                    cx={pt[0]}
                    cy={pt[1]}
                    r="3.5"
                    fill="#059669"
                  />
                );
              })}

              {/* Dynamic Labels matching the 5 competencies */}
              <g style={{ fontSize: "9px", fill: "#475569", fontWeight: 600 }}>
                <text x="120" y="24" textAnchor="middle">
                  Chuyên môn
                </text>
                <text x="185" y="77" textAnchor="start">
                  Tư duy
                </text>
                <text x="162" y="160" textAnchor="start">
                  Dẫn chứng
                </text>
                <text x="78" y="160" textAnchor="end">
                  Giao tiếp
                </text>
                <text x="55" y="77" textAnchor="end">
                  Phù hợp JD
                </text>
              </g>
            </svg>
          </div>
        </section>
      </div>

      <div className="insight-grid">
        <section className="white-card strengths">
          <div className="card-title">
            <h3>
              <span>
                <TrendingUp />
              </span>{" "}
              Điểm mạnh nổi bật
            </h3>
          </div>
          <ul>
            {evalData.strengths.map((str, i) => (
              <li key={i}>{str}</li>
            ))}
          </ul>
        </section>

        <section className="white-card improvements">
          <div className="card-title">
            <h3>
              <span>
                <Lightbulb />
              </span>{" "}
              Gợi ý hoàn thiện thêm
            </h3>
          </div>
          <ul>
            {evalData.improvements.map((imp, i) => (
              <li key={i}>{imp}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function QuestionReview({
  transcript,
  session: propSession,
  candidateView = false,
}: {
  transcript?: TranscriptResult | null;
  session?: InterviewSession | null;
  candidateView?: boolean;
}) {
  const [activeTurn, setActiveTurn] = useState(0);
  const session = propSession || loadInterviewSession();
  const isCurrentActiveSession =
    !session?.session_id ||
    session.session_id === sessionStorage.getItem("current_session_id");

  // Collect real answered turns from session and history (only use sessionStorage if it belongs to this session)
  const historyTurns: any[] = (() => {
    if (!isCurrentActiveSession) return [];
    try {
      const h = sessionStorage.getItem("interview_turns_history");
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  })();

  const rawSessionTurns = session?.turns || [];
  const maxTurns = Math.max(rawSessionTurns.length, historyTurns.length);

  const turnsToDisplay = Array.from({ length: maxTurns }, (_, idx) => {
    const fromHistory = historyTurns[idx];
    const fromSession = rawSessionTurns[idx];

    const question =
      fromHistory?.question ||
      fromSession?.question ||
      (fromSession as any)?.question_text ||
      (idx === 0 ? sessionStorage.getItem("current_question_text") : null) ||
      `Câu hỏi ${idx + 1}`;

    const stage =
      fromHistory?.stage || fromSession?.stage || "Phỏng vấn chuyên môn";

    const criterion =
      fromHistory?.criterion || fromSession?.criterion || "Đánh giá năng lực";

    let answer =
      fromHistory?.answer ||
      fromSession?.answer ||
      (fromSession as any)?.answer_text ||
      null;
    if (!answer && idx === 0 && transcript?.corrected_transcript) {
      answer = transcript.corrected_transcript;
    }
    if (
      !answer &&
      sessionStorage.getItem("last_turn_answer") &&
      idx === maxTurns - 1
    ) {
      answer = sessionStorage.getItem("last_turn_answer");
    }

    return {
      turnIndex: idx + 1,
      stage,
      criterion,
      question,
      answer: answer || "(Ứng viên chưa hoàn thành câu trả lời này)",
    };
  });

  if (turnsToDisplay.length === 0) {
    return (
      <Card className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-[15px] text-zinc-500">
        Chưa có câu hỏi nào được ghi nhận trong phiên phỏng vấn này.
      </Card>
    );
  }

  const current = turnsToDisplay[activeTurn] || turnsToDisplay[0];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Question List */}
      <Card className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-4">
        <div className="mb-3 px-2 text-[14px] font-semibold text-zinc-950">
          Các câu hỏi ({turnsToDisplay.length})
        </div>
        <div className="flex flex-col gap-1.5">
          {turnsToDisplay.map((t, idx) => {
            const isActive = activeTurn === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTurn(idx)}
                className={
                  isActive
                    ? "flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-100/90 px-3 py-3 text-left transition-colors cursor-pointer"
                    : "flex w-full items-center gap-3 rounded-xl border border-transparent bg-transparent px-3 py-3 text-left transition-colors hover:bg-zinc-50 cursor-pointer"
                }
              >
                <span
                  className={
                    isActive
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-semibold text-white tabular-nums"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[13px] font-semibold text-zinc-600 tabular-nums"
                  }
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold leading-snug text-zinc-950">
                    Câu hỏi {idx + 1}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-zinc-500">
                    {t.criterion || t.stage || "Kiến thức chuyên môn"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Right Question & Answer Detail */}
      <Card className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 lg:col-span-8">
        <Badge
          variant="secondary"
          className="px-3 py-1 text-[12px] font-semibold"
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
          CÂU HỎI {activeTurn + 1} · {current.stage.toUpperCase()}
        </Badge>

        <h2 className="m-0 mt-4 text-[19px] font-semibold leading-[1.55] tracking-[-0.01em] text-zinc-950">
          {current.question}
        </h2>

        <div className="mt-6 border-t border-zinc-100 pt-5">
          <h4 className="m-0 mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-zinc-500">
            Câu trả lời của ứng viên
          </h4>
          <p className="m-0 rounded-xl border border-zinc-200 bg-zinc-50/70 px-5 py-4 text-[15px] leading-[1.7] text-zinc-800">
            "{current.answer}"
          </p>
        </div>
      </Card>
    </div>
  );
}

function VideoReport({ sessionId }: { sessionId?: string }) {
  const [gazeData] = useState<GazeReportResult | null>(() => {
    try {
      if (sessionId && sessionId !== "latest") {
        const byId = localStorage.getItem(`gaze_result_${sessionId}`);
        if (byId) return JSON.parse(byId);
      }
      const rawSession = sessionStorage.getItem(GAZE_RESULT_STORAGE_KEY);
      if (rawSession) return JSON.parse(rawSession);
      const rawLocal = localStorage.getItem(GAZE_RESULT_STORAGE_KEY);
      return rawLocal ? JSON.parse(rawLocal) : null;
    } catch {
      return null;
    }
  });

  const [selectedSnapshot, setSelectedSnapshot] = useState<GazeEvent | null>(
    null,
  );
  const [filterMode, setFilterMode] = useState<"all" | "evidence">("all");

  // Listen to Escape key to close Lightbox modal
  useEffect(() => {
    if (!selectedSnapshot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSnapshot(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSnapshot]);

  const presencePct = gazeData ? `${gazeData.face_presence_pct}%` : "--";
  const straightPct = gazeData ? `${gazeData.looking_straight_pct}%` : "--";
  const awayPct = gazeData ? `${gazeData.looking_away_pct}%` : "--";
  const notDetectedPct = gazeData ? `${gazeData.not_detected_pct}%` : "--";

  const events: GazeEvent[] = gazeData?.events || [];

  const evidenceCount = events.filter((e) => Boolean(e.snapshotUrl)).length;
  const displayedEvents =
    filterMode === "evidence"
      ? events.filter((e) => Boolean(e.snapshotUrl))
      : events;

  return (
    <>
      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Khuôn mặt hiện diện"
          value={presencePct}
          icon={ScanFace}
        />
        <KpiCard label="Nhìn thẳng" value={straightPct} icon={Eye} />
        <KpiCard label="Nhìn lệch hướng" value={awayPct} icon={EyeOff} />
        <KpiCard label="Không nhận diện" value={notDetectedPct} icon={UserX} />
      </section>

      <section
        className="white-card event-section"
        style={{ minHeight: "auto", padding: "24px" }}
      >
        <div className="card-title" style={{ marginBottom: "16px" }}>
          <div>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 700,
                margin: 0,
                color: "#111827",
              }}
            >
              Dòng thời gian sự kiện hướng nhìn
            </h3>
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "4px",
                display: "block",
              }}
            >
              {gazeData?.summary ||
                "Tín hiệu phân tích bằng @mediapipe/tasks-vision trên trình duyệt"}
            </span>
          </div>
        </div>

        {/* Filter bar & event count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "10px 14px",
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}
            >
              Tổng số sự kiện:{" "}
              <b style={{ color: "#0f766e" }}>{events.length}</b>
            </span>
            {evidenceCount > 0 && (
              <span
                style={{
                  fontSize: "11px",
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                }}
              >
                {evidenceCount} ảnh bằng chứng
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                border: "1px solid",
                borderColor: filterMode === "all" ? "#10b981" : "#cbd5e1",
                background: filterMode === "all" ? "#ecfdf5" : "#ffffff",
                color: filterMode === "all" ? "#047857" : "#64748b",
                cursor: "pointer",
                fontWeight: filterMode === "all" ? 700 : 500,
                transition: "all 0.15s",
              }}
            >
              Tất cả ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("evidence")}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                border: "1px solid",
                borderColor: filterMode === "evidence" ? "#10b981" : "#cbd5e1",
                background: filterMode === "evidence" ? "#ecfdf5" : "#ffffff",
                color: filterMode === "evidence" ? "#047857" : "#64748b",
                cursor: "pointer",
                fontWeight: filterMode === "evidence" ? 700 : 500,
                transition: "all 0.15s",
              }}
            >
              Có ảnh chụp ({evidenceCount})
            </button>
          </div>
        </div>

        {/* Vertical Timeline container */}
        {displayedEvents.length === 0 ? (
          <div
            style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px dashed #cbd5e1",
              margin: "16px 0",
            }}
          >
            Không có sự kiện nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              paddingLeft: "32px",
              margin: "10px 0 20px",
              maxHeight: "490px",
              overflowY: "auto",
              paddingRight: "10px",
            }}
          >
            {/* Continuous vertical timeline guide line */}
            <div
              style={{
                position: "absolute",
                left: "11px",
                top: "14px",
                bottom: "14px",
                width: "2px",
                background: "#e2e8f0",
              }}
            />

            {displayedEvents.map((x, i) => {
              const isWarning =
                x.description.includes("lệch") ||
                x.description.includes("trái") ||
                x.description.includes("phải") ||
                x.description.includes("dưới") ||
                x.description.includes("lên") ||
                x.type === "off_screen";

              return (
                <div
                  key={`${x.timestamp}-${i}`}
                  style={{
                    position: "relative",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  {/* Timeline node dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-27px",
                      top: "16px",
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: isWarning ? "#f59e0b" : "#10b981",
                      border: "2px solid #ffffff",
                      boxShadow:
                        "0 0 0 2px " + (isWarning ? "#fde68a" : "#a7f3d0"),
                      zIndex: 2,
                    }}
                  />

                  {/* Card detail */}
                  <div
                    style={{
                      flex: 1,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            background: "#0f172a",
                            color: "#f8fafc",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {x.timestamp}
                        </span>
                        {x.questionIndex && (
                          <span
                            style={{
                              background: "#e0e7ff",
                              color: "#3730a3",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            Câu {x.questionIndex}
                            {x.stage ? ` • ${x.stage.toUpperCase()}` : ""}
                          </span>
                        )}
                        {x.activity && (
                          <span
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontWeight: 500,
                            }}
                          >
                            {x.activity}
                          </span>
                        )}
                        <span
                          style={{
                            background: isWarning ? "#fef3c7" : "#f1f5f9",
                            color: isWarning ? "#b45309" : "#475569",
                            fontSize: "11px",
                            padding: "1px 7px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          {x.duration}s
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontSize: "13px",
                          color: "#1e293b",
                          fontWeight: 600,
                          lineHeight: 1.5,
                        }}
                      >
                        {x.description}
                      </p>
                      {x.questionText && (
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "12px",
                            color: "#4b5563",
                            background: "#f1f5f9",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            borderLeft: "3px solid #6366f1",
                            lineHeight: 1.4,
                            fontStyle: "italic",
                          }}
                        >
                          <b style={{ fontStyle: "normal", color: "#1f2937" }}>
                            Câu hỏi lúc đó:{" "}
                          </b>
                          "{x.questionText}"
                        </p>
                      )}
                    </div>

                    {/* Snapshot thumbnail */}
                    {x.snapshotUrl && (
                      <div
                        onClick={() => setSelectedSnapshot(x)}
                        title="Bấm để phóng to bằng chứng (Esc để đóng)"
                        style={{
                          cursor: "pointer",
                          position: "relative",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "1px solid #cbd5e1",
                          flexShrink: 0,
                          width: "90px",
                          height: "60px",
                          background: "#0f172a",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                        }}
                      >
                        <img
                          src={x.snapshotUrl}
                          alt="Bằng chứng"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(15, 23, 42, 0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0,
                            transition: "opacity 0.15s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.opacity = "1")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.opacity = "0")
                          }
                        >
                          <Eye size={18} color="#ffffff" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="neutral-note" style={{ marginTop: "16px" }}>
          <ShieldCheck />
          <p>
            <b>Lưu ý về đánh giá</b>
            <span>
              Các sự kiện trên là tín hiệu quan sát từ mô hình Face Landmarker
              (MediaPipe WebAssembly), hỗ trợ đánh giá mức độ tương tác và độ tự
              tin của ứng viên.
            </span>
          </p>
        </div>
      </section>

      {/* shadcn/ui Dialog Lightbox for Snapshot Evidence */}
      <Dialog
        open={Boolean(selectedSnapshot)}
        onOpenChange={(open) => {
          if (!open) setSelectedSnapshot(null);
        }}
      >
        <DialogContent className="max-w-[740px] gap-0 overflow-hidden p-0">
          {selectedSnapshot && (
            <>
              <DialogHeader className="border-b border-zinc-200 px-6 py-4">
                <div className="flex items-center gap-3 pr-8">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-[15px]">
                      Ảnh chụp bằng chứng hướng nhìn
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span>
                        Thời điểm:{" "}
                        <b className="font-mono text-zinc-900">
                          {selectedSnapshot.timestamp}
                        </b>
                      </span>
                      <span>·</span>
                      <span>
                        Thời lượng:{" "}
                        <b className="text-zinc-900">
                          {selectedSnapshot.duration}s
                        </b>
                      </span>
                      {selectedSnapshot.questionIndex && (
                        <>
                          <span>·</span>
                          <Badge variant="secondary" className="text-[11px]">
                            Câu {selectedSnapshot.questionIndex}
                            {selectedSnapshot.stage
                              ? ` · ${selectedSnapshot.stage.toUpperCase()}`
                              : ""}
                          </Badge>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex max-h-[60vh] min-h-[320px] items-center justify-center bg-zinc-950 p-4">
                {selectedSnapshot.snapshotUrl ? (
                  <img
                    src={selectedSnapshot.snapshotUrl}
                    alt="Bằng chứng vi phạm"
                    className="max-h-[56vh] max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="text-sm text-zinc-400">
                    Không có hình ảnh snapshot
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <div className="min-w-[220px] flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Hành vi ghi nhận
                  </div>
                  <p className="m-0 mt-1 text-sm font-medium text-zinc-900">
                    {selectedSnapshot.description}
                  </p>
                  {selectedSnapshot.questionText && (
                    <p className="m-0 mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs italic text-zinc-600">
                      <span className="not-italic font-semibold text-zinc-800">
                        Đang trong câu hỏi:{" "}
                      </span>
                      "{selectedSnapshot.questionText}"
                    </p>
                  )}
                </div>

                {selectedSnapshot.snapshotUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={selectedSnapshot.snapshotUrl}
                      download={`evidence-${selectedSnapshot.timestamp.replace(":", "-")}.jpg`}
                    >
                      <Download className="h-3.5 w-3.5" /> Tải ảnh
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
