import {
  computeAiEvaluation,
  isNonAnswer,
  type CompetencyResult,
  type OverallAiEvaluation,
} from "@/utils/aiEvaluation";
import { ReportContent } from "@/components/report/ReportContent";
import { SettingsFormContent } from "@/components/settings/SettingsFormContent";
export { SettingsFormContent, ReportContent, computeAiEvaluation, isNonAnswer };
export type { CompetencyResult, OverallAiEvaluation };
import {
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
import { useEffect, useMemo, useRef, useState } from "react";
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
  Keyboard,
  Lightbulb,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ScanFace,
  Search,
  Settings,
  ShieldCheck,
  SkipForward,
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
import {
  AppShell,
  FilterToolbar,
  PageHeader,
  ScoreBadge,
  SearchInput,
  StatCard,
  StatusBadge,
} from "@/components/shared";
import { HelpCenterContent } from "@/components/layout/HelpCenterContent";
import { AdminTrafficHistogramCard } from "@/components/dashboard/AdminTrafficHistogramCard";
import { QualityDonutCard } from "@/components/dashboard/QualityDonutCard";
import { RecentSessionsCard } from "@/components/dashboard/RecentSessionsCard";
import {
  buildQualityDonutData,
  buildScoreHistogramData,
  evaluateSessions,
  fillMissingDates,
  filterSessionsByDateRange,
  getScoreMeta,
  isSessionCompleted,
  toLocalIsoDate,
} from "@/utils/dashboardMetrics";
import { getAvatarInitials } from "@/utils/scoreMeta";
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
    <AppShell
      role="admin"
      activeKey={page || "dashboard"}
      onNavigate={(p) => go(p as Page)}
      wide={wide}
    >
      {children}
    </AppShell>
  );
}

export function InterviewsPage({ go }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("Tất cả");
  const urlQuery = searchParams.get("q") || "";
  const [search, setSearch] = useState(urlQuery);

  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };
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
    const initial = getAvatarInitials(candidateName, "UV");
    const role = getSessionJobTitle(s);
    const isCompleted = isSessionCompleted(s);
    const status = isCompleted ? "Hoàn thành" : "Chưa hoàn thành";
    return {
      id: s.session_id || `INT-${i + 1}`,
      name: candidateName,
      initial,
      role,
      date: dateStr,
      isCompleted,
      status,
      score: isCompleted ? evalData.overallScore : null,
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

  const completedCount = records.filter((r) => r.isCompleted).length;
  const processingCount = records.length - completedCount;
  const avgScoreNum = (() => {
    const valid = records
      .filter((r) => r.isCompleted && r.score !== null)
      .map((r) => r.score as number);
    return valid.length > 0
      ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
      : null;
  })();
  const avgMeta = avgScoreNum !== null ? getScoreMeta(avgScoreNum) : null;

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
          <StatCard
            label="Tổng phiên"
            value={records.length}
            icon={Video}
          />
          <StatCard
            label="Hoàn thành"
            value={completedCount}
            badgeText={
              records.length > 0
                ? `${Math.round((completedCount / records.length) * 100)}%`
                : undefined
            }
            badgeTone="success"
            icon={CheckCircle2}
          />
          <StatCard
            label="Chưa hoàn thành"
            value={processingCount}
            badgeText={processingCount > 0 ? "Đang bỏ dở" : undefined}
            badgeTone={processingCount > 0 ? "warning" : "neutral"}
            icon={Clock3}
          />
          <StatCard
            label="Điểm trung bình"
            value={avgScoreNum !== null ? avgScoreNum : "—"}
            badgeText={avgMeta?.label}
            badgeTone={avgMeta?.badgeTone ?? "neutral"}
            icon={BarChart3}
          />
        </section>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <FilterToolbar
            className="mb-5"
            left={
              <SearchInput
                placeholder="Tìm ứng viên, vị trí..."
                value={search}
                onChange={handleSearchChange}
                size="sm"
                className="max-w-xs"
              />
            }
            right={
              <Tabs
                value={filter}
                onValueChange={(v) => {
                  setFilter(v);
                  setCurrentPage(1);
                }}
              >
                <TabsList>
                  <TabsTrigger value="Tất cả">
                    Tất cả ({records.length})
                  </TabsTrigger>
                  <TabsTrigger value="Hoàn thành">
                    Hoàn thành ({completedCount})
                  </TabsTrigger>
                  <TabsTrigger value="Chưa hoàn thành">
                    Chưa hoàn thành ({processingCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />

          {loading ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center text-sm text-zinc-500">
              Đang tải danh sách phiên phỏng vấn...
            </div>
          ) : paginated.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="whitespace-nowrap">Ứng viên</TableHead>
                  <TableHead className="whitespace-nowrap">Vị trí</TableHead>
                  <TableHead className="whitespace-nowrap">Thời gian</TableHead>
                  <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
                  <TableHead className="whitespace-nowrap">Điểm AI</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    Thao tác
                  </TableHead>
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
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-white">
                            {p.initial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="whitespace-nowrap font-semibold text-zinc-950">
                          {p.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-800">
                      <div className="max-w-[260px] truncate" title={p.role}>
                        {p.role}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-zinc-500">
                      {p.date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge
                        status={p.isCompleted ? "completed" : "incomplete"}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] font-semibold tabular-nums">
                      <ScoreBadge
                        score={p.isCompleted ? p.score : null}
                        mode="inline"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
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

export function ReportsPage({ go }: Props) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>(() =>
    getCachedAllSessions(),
  );
  const [loading, setLoading] = useState<boolean>(
    () => getCachedAllSessions().length === 0,
  );
  const [chartMode, setChartMode] = useState<"daily" | "scores">("scores");

  // Quick Report Filters: Time Range + Job Position + Table Status (default: completed only)
  const [datePreset, setDatePreset] = useState<"all" | "7d" | "30d" | "custom">(
    "all",
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [tableStatusFilter, setTableStatusFilter] = useState<
    "completed" | "all" | "incomplete"
  >("completed");

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

  const applyDatePreset = (preset: "all" | "7d" | "30d") => {
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

  const jobOptions = useMemo(() => {
    const titles = new Set<string>();
    sessions.forEach((s) => {
      const title = getSessionJobTitle(s).trim();
      if (title) titles.add(title);
    });
    return Array.from(titles).sort((a, b) => a.localeCompare(b, "vi"));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const byDate = filterSessionsByDateRange(sessions, fromDate, toDate);
    if (jobFilter === "all") return byDate;
    return byDate.filter((s) => getSessionJobTitle(s).trim() === jobFilter);
  }, [sessions, fromDate, toDate, jobFilter]);

  const evaluated = useMemo(
    () => evaluateSessions(filteredSessions, (s) => computeAiEvaluation(s)),
    [filteredSessions],
  );

  const completedEvaluated = useMemo(
    () => evaluated.filter((item) => item.isCompleted),
    [evaluated],
  );
  const incompleteEvaluated = useMemo(
    () => evaluated.filter((item) => !item.isCompleted),
    [evaluated],
  );

  const validScores = completedEvaluated.map((x) => x.eval.overallScore);
  const avgScore =
    validScores.length > 0
      ? Math.round(
          validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length,
        )
      : "—";
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : "—";

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

  // Default table shows ONLY completed/scored reports (hides incomplete "—" rows unless selected)
  const tableSource = useMemo(() => {
    if (tableStatusFilter === "completed") return completedEvaluated;
    if (tableStatusFilter === "incomplete") return incompleteEvaluated;
    return evaluated;
  }, [tableStatusFilter, completedEvaluated, incompleteEvaluated, evaluated]);

  const tableRows = tableSource.map((item, i) => {
    const pName = item.candidateName;
    const initial = getAvatarInitials(pName, "UV");
    const role = item.jobTitle;
    const score = item.isCompleted ? item.eval.overallScore : null;
    const meta = getScoreMeta(score);

    return {
      id: item.session.session_id || String(i),
      candidateName: pName,
      candidateInitials: initial,
      jobTitle: role,
      dateLabel: item.session.created_at
        ? new Date(item.session.created_at).toLocaleDateString("vi-VN")
        : "Gần đây",
      timestamp: item.timestamp,
      score,
      status:
        meta.key === "good"
          ? ("completed" as const)
          : meta.key === "poor"
            ? ("low" as const)
            : ("processing" as const),
      statusLabel: meta.hrLabel,
      onSelect: () => {
        saveInterviewSession(item.session);
        navigate(`/admin/reports/${item.session.session_id}`);
      },
    };
  });

  const hasFilters = Boolean(fromDate || toDate || jobFilter !== "all");

  return (
    <Shell page="reports" go={go}>
      <PageHeader
        title="Báo cáo"
        description="Tổng hợp chất lượng ứng viên và hiệu quả tuyển dụng theo thời gian và vị trí."
        action={
          <Button variant="outline" size="lg" onClick={() => window.print()}>
            <Download /> Xuất báo cáo
          </Button>
        }
      />

      <div className="space-y-5">
        {/* Report Quick Filter Bar: Time Range + Job Position */}
        <Card className="rounded-2xl border border-zinc-200 bg-white px-5 py-3.5">
          <FilterToolbar
            left={
              <>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-800 mr-1">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  Thời gian
                </span>
                {(
                  [
                    { id: "all", label: "Tất cả" },
                    { id: "7d", label: "7 ngày" },
                    { id: "30d", label: "30 ngày" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id)}
                    className={
                      datePreset === p.id
                        ? "h-8 rounded-full border border-zinc-900 bg-zinc-900 px-3 text-[12px] font-medium text-white cursor-pointer transition-colors"
                        : "h-8 rounded-full border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer transition-colors"
                    }
                  >
                    {p.label}
                  </button>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    aria-label="Từ ngày"
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setFromDate(e.target.value);
                    }}
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 focus:border-zinc-900 focus:outline-none"
                  />
                  <span className="text-xs text-zinc-400">–</span>
                  <input
                    aria-label="Đến ngày"
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setToDate(e.target.value);
                    }}
                    className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[12px] text-zinc-800 focus:border-zinc-900 focus:outline-none"
                  />
                </div>
              </>
            }
            right={
              <>
                {jobOptions.length > 0 && (
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger
                      aria-label="Lọc theo vị trí tuyển dụng"
                      className="h-8 w-[210px] rounded-full bg-white text-[12px]"
                    >
                      <SelectValue placeholder="Tất cả vị trí" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả vị trí</SelectItem>
                      {jobOptions.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      applyDatePreset("all");
                      setJobFilter("all");
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
                  </button>
                )}
              </>
            }
          />
        </Card>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <AdminTrafficHistogramCard
              mode={chartMode}
              onModeChange={setChartMode}
              dailyData={dailyData}
              histogramData={histogramData}
              loading={loading}
              summaryStats={[
                { label: "Phiên đã chấm", value: completedEvaluated.length },
                { label: "Điểm TB", value: avgScore },
                { label: "Cao nhất", value: maxScore },
              ]}
            />
          </div>
          <div className="lg:col-span-5">
            <QualityDonutCard
              title="Phân bổ đánh giá"
              badgeLabel={hasFilters ? "Theo bộ lọc" : "Toàn thời gian"}
              totalScored={qualityDonut.totalScored}
              segments={qualityDonut.segments}
              loading={loading}
            />
          </div>
        </section>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Lọc trạng thái báo cáo"
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-1"
            >
              {(
                [
                  {
                    id: "completed",
                    label: `Đã hoàn thành (${completedEvaluated.length})`,
                  },
                  { id: "all", label: `Tất cả (${evaluated.length})` },
                  {
                    id: "incomplete",
                    label: `Chưa hoàn thành (${incompleteEvaluated.length})`,
                  },
                ] as const
              ).map((tab) => {
                const active = tableStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTableStatusFilter(tab.id)}
                    className={
                      active
                        ? "rounded-lg border-0 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-zinc-950 shadow-xs cursor-pointer"
                        : "rounded-lg border-0 bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-zinc-600 hover:text-zinc-950 cursor-pointer"
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <RecentSessionsCard
            title="Danh sách báo cáo chi tiết"
            rows={tableRows}
            showCandidateColumn
            enableSort
            searchPlaceholder="Tìm báo cáo theo ứng viên, vị trí..."
            emptyMessage="Không có báo cáo nào phù hợp với bộ lọc hiện tại."
            pageSize={8}
            itemLabel="báo cáo"
          />
        </div>
      </div>
    </Shell>
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
  const [readingWindow, setReadingWindow] = useState<boolean>(true);

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

  // Lớp A: Give candidate a 6-second reading grace window whenever a new question appears
  useEffect(() => {
    if (!questionText) return;
    setReadingWindow(true);
    const timer = setTimeout(() => setReadingWindow(false), 6000);
    return () => clearTimeout(timer);
  }, [questionText, turnIndex]);

  const currentPhase: "reading" | "thinking" | "answering" = recording
    ? "answering"
    : ttsStatus === "playing" || readingWindow
      ? "reading"
      : "thinking";

  useEffect(() => {
    clientGazeTracker.setContext({
      sessionId,
      questionIndex: turnIndex + 1,
      totalQuestions,
      questionText,
      stage,
      phase: currentPhase,
      activity: recording
        ? "Đang trả lời câu hỏi"
        : currentPhase === "reading"
          ? "Đang đọc / nghe câu hỏi"
          : "Đang suy nghĩ trả lời",
    });
  }, [
    sessionId,
    turnIndex,
    totalQuestions,
    questionText,
    stage,
    recording,
    currentPhase,
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
      } else if (state.status === "READING_QUESTION") {
        setGazeStatus("Đang đọc câu hỏi • Bình thường");
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
      } else if (state.status === "SECOND_PERSON") {
        setGazeStatus("Cảnh báo: Phát hiện người thứ hai trong khung hình");
        setGazeType("alert");
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
      setGazeStatus("Camera đã tắt • Ghi nhận rời khung hình");
      clientGazeTracker.setCameraDisabled(true);
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
              clientGazeTracker.start(videoRef.current, {
                preserveSession: true,
              });
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
      <div className="room-page room-page--empty">
        <div className="room-empty-card">
          <div className="room-empty-icon">
            <Video size={24} />
          </div>
          <h2>Chưa có phiên phỏng vấn mới</h2>
          <p>
            Vui lòng tải lên CV và chọn công việc từ trang Bắt đầu phỏng vấn để
            tạo bộ câu hỏi phù hợp.
          </p>
          <button
            type="button"
            className="room-dock-primary"
            onClick={() => go("start")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <span>Tạo phiên phỏng vấn mới</span>
            <ArrowRight size={16} />
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
    "Phỏng vấn năng lực";

  const candidateName = user?.name || "Ứng viên";
  const showGazeNotice =
    cam && (gazeType === "calibrating" || gazeType === "alert");

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-header-left">
          <button
            type="button"
            className="room-logo-btn"
            onClick={() => go("dashboard")}
          >
            <BrandLogo size="sm" />
          </button>
          <span className="room-header-sep" aria-hidden="true" />
          <span className="room-job-title" title={jobTitle}>
            {jobTitle}
          </span>
        </div>

        <div className="room-header-center">
          <div
            className="room-step-bars"
            aria-label={`Câu ${turnIndex + 1} trên ${totalQuestions}`}
          >
            {Array.from({ length: totalQuestions }, (_, i) => (
              <span
                key={i}
                className={`room-step-bar ${
                  i < turnIndex
                    ? "is-done"
                    : i === turnIndex
                      ? "is-current"
                      : ""
                }`}
              />
            ))}
          </div>
          <span className="room-step-label">
            Câu <b>{turnIndex + 1}</b>/{totalQuestions}
          </span>
        </div>

        <div className={`room-header-timer ${recording ? "is-recording" : ""}`}>
          <span className="room-timer-dot" />
          <span>{fmt}</span>
        </div>
      </header>

      <main className="room-stage">
        {/* Editorial question block aligned directly under the laptop webcam */}
        <section className="room-question-block">
          <div className="room-question-meta">
            <div className="room-question-eyebrow">
              <span className="room-stage-name">Vòng {stage}</span>
              <span className="room-dot-sep" aria-hidden="true">
                ·
              </span>
              <span className="room-criterion-name">{criterion}</span>
            </div>

            <button
              type="button"
              className={`room-listen-btn ${ttsStatus === "playing" ? "is-playing" : ""}`}
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
              {ttsStatus === "playing" ? (
                <>
                  <Volume2 size={14} />
                  <span>Đang đọc · Dừng</span>
                </>
              ) : (
                <>
                  <Headphones size={14} />
                  <span>Nghe câu hỏi</span>
                </>
              )}
            </button>
          </div>

          <h1 className="room-question-heading">{questionText}</h1>
        </section>

        {/* Centered Video Stage */}
        <section
          className={`room-video-stage ${recording ? "is-recording" : ""} ${
            showTextInput ? "is-compact" : ""
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ opacity: cam ? 1 : 0 }}
          />

          {!cam && (
            <div className="room-off-cam-stage">
              <div className="room-off-cam-avatar">
                {candidateName.slice(0, 2).toUpperCase()}
              </div>
              <span className="room-off-cam-name">{candidateName}</span>
              <span className="room-off-cam-status">
                {mic
                  ? "Camera đang tắt · Micro đang bật"
                  : "Camera và Micro đang tắt"}
              </span>
            </div>
          )}

          {/* Only surface real actionable alerts or brief calibration; stay silent during normal gaze */}
          {showGazeNotice && (
            <div className={`room-gaze-notice is-${gazeType}`}>
              <span className="room-gaze-notice-dot" />
              <span>{gazeStatus}</span>
            </div>
          )}

          {/* Top-right subtle REC pill when recording */}
          {recording && (
            <div className="room-rec-indicator">
              <span className="room-rec-dot" />
              <span>Đang ghi âm</span>
            </div>
          )}

          {/* Bottom-left candidate name / muted indicator */}
          {!mic ? (
            <div className="room-video-chip is-muted">
              <MicOff size={13} />
              <span>Micro đang tắt</span>
            </div>
          ) : (
            cam && (
              <div className="room-video-chip">
                <span>{candidateName}</span>
              </div>
            )
          )}

          {/* Live Caption overlay inside video bottom-center while speaking */}
          {recording && !showTextInput && (
            <div className="room-live-caption" role="status" aria-live="polite">
              {liveSpeechText ? (
                <p>{liveSpeechText}</p>
              ) : (
                <p className="is-placeholder">
                  Đang lắng nghe… Hãy trả lời tự nhiên vào micro.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Inline error banner (only when needed) */}
        {error && (
          <div className="room-inline-alert" role="alert">
            <span>{error}</span>
            <div className="room-inline-alert-actions">
              <button
                type="button"
                className="room-alert-btn is-primary"
                onClick={retryMicrophone}
              >
                Thử lại Micro
              </button>
              <button
                type="button"
                className="room-alert-btn"
                onClick={() => setShowTextInput(true)}
              >
                Gõ văn bản
              </button>
            </div>
          </div>
        )}

        {/* Inline evaluating status (only while STT/AI is running) */}
        {inRoomStatus && (
          <div className="room-eval-bar" role="status" aria-live="polite">
            <span className="room-spinner" />
            <span>{inRoomStatus}</span>
          </div>
        )}

        {/* Clean Light Editorial Text Composer (only shown when user opts to type) */}
        {showTextInput && (
          <section className="room-composer">
            <div className="room-composer-head">
              <label htmlFor="room-text-answer">Trả lời bằng văn bản</label>
              <button
                type="button"
                className="room-composer-close"
                onClick={() => setShowTextInput(false)}
              >
                <Mic size={13} />
                <span>Chuyển sang nói</span>
              </button>
            </div>
            <div className="room-composer-row">
              <textarea
                id="room-text-answer"
                rows={3}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Nhập câu trả lời của bạn tại đây..."
                className="room-composer-input"
              />
              <button
                type="button"
                className="room-composer-submit"
                disabled={evaluating || textAnswer.trim().length < 5}
                onClick={() => handleAnswerSubmission(textAnswer)}
              >
                {evaluating ? "Đang chấm..." : "Gửi câu trả lời"}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Unified Light Editorial Bottom Dock */}
      <footer className="room-dock">
        <div className="room-dock-left">
          <button
            type="button"
            className="room-dock-ghost"
            disabled={uploading || evaluating || recording}
            onClick={() =>
              handleAnswerSubmission("Tôi xin phép bỏ qua câu hỏi này.")
            }
          >
            <SkipForward size={15} />
            <span>Bỏ qua câu này</span>
          </button>
        </div>

        <div className="room-dock-center">
          <button
            type="button"
            className={`room-icon-btn ${!mic ? "is-off" : ""}`}
            onClick={toggleMic}
            title={mic ? "Tắt Micro" : "Bật Micro"}
            aria-label={mic ? "Tắt Micro" : "Bật Micro"}
          >
            {mic ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          <button
            type="button"
            className={`room-icon-btn ${!cam ? "is-off" : ""}`}
            onClick={toggleCam}
            title={cam ? "Tắt Camera" : "Bật Camera"}
            aria-label={cam ? "Tắt Camera" : "Bật Camera"}
          >
            {cam ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          <span className="room-dock-sep" aria-hidden="true" />

          {!recording ? (
            <button
              type="button"
              className="room-dock-primary"
              disabled={uploading || evaluating}
              onClick={() => {
                if (showTextInput) setShowTextInput(false);
                startRecording();
              }}
            >
              <Mic size={16} />
              <span>
                {uploading || evaluating
                  ? "Đang xử lý…"
                  : "Bắt đầu trả lời"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="room-dock-stop"
              onClick={stopRecording}
            >
              <Square size={15} />
              <span>Hoàn thành câu trả lời</span>
            </button>
          )}

          <button
            type="button"
            className={`room-dock-toggle ${showTextInput ? "is-active" : ""}`}
            disabled={recording || uploading || evaluating}
            onClick={() => setShowTextInput((prev) => !prev)}
            title="Trả lời bằng văn bản"
          >
            <Keyboard size={16} />
            <span>Gõ chữ</span>
          </button>
        </div>

        <div className="room-dock-right">
          <button
            type="button"
            className="room-dock-end"
            disabled={uploading || evaluating}
            onClick={handleEndInterview}
          >
            <X size={15} />
            <span>Kết thúc</span>
          </button>
        </div>
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
