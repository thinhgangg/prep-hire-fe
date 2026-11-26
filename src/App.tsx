import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Gauge,
  RotateCcw,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  ScoreBadge,
  SectionHeader,
  StatCard,
  getVietnameseDateEyebrow,
} from "@/components/shared";
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
  getScoreMeta,
  toLocalIsoDate,
} from "@/utils/dashboardMetrics";
import { getAvatarInitials } from "@/utils/scoreMeta";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchRealJobs, getCachedRealJobs, DbJob } from "./services/jobApi";
import {
  saveInterviewSession,
  getAllSessions,
  getCachedAllSessions,
  type InterviewSession,
} from "./services/interviewApi";
import { useAuth } from "./auth/AuthContext";
import { computeAiEvaluation } from "@/utils/aiEvaluation";
export { AuthPage, Login } from "./auth/AuthPage";

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

  const completedItems = useMemo(
    () => evaluated.filter((x) => x.isCompleted),
    [evaluated],
  );
  const completedCount = completedItems.length;

  const completionRate =
    evaluated.length > 0
      ? Math.round((completedCount / evaluated.length) * 100)
      : 0;

  // Strictly match KPI, Histogram, and Quality Donut to completed sessions only
  const scoredList = completedItems.map((x) => x.eval.overallScore);
  const avgScoreNum =
    scoredList.length > 0
      ? Math.round(
          (scoredList.reduce((a, b) => a + b, 0) / scoredList.length) * 10,
        ) / 10
      : null;
  const avgScore = avgScoreNum !== null ? avgScoreNum.toFixed(1) : "—";
  const avgScoreMeta =
    avgScoreNum !== null ? getScoreMeta(avgScoreNum) : null;
  const maxScore = scoredList.length > 0 ? Math.max(...scoredList) : "—";
  const minScore = scoredList.length > 0 ? Math.min(...scoredList) : "—";

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

  // Top 5 Highest Scoring Candidates — deduplicated by candidate (best completed session per person)
  const topCandidates = useMemo(() => {
    const bestByCandidate = new Map<string, (typeof completedItems)[number]>();
    for (const item of completedItems) {
      const key =
        item.session.user_id != null
          ? `uid-${item.session.user_id}`
          : item.candidateName.trim().toLowerCase();
      const existing = bestByCandidate.get(key);
      if (
        !existing ||
        item.eval.overallScore > existing.eval.overallScore ||
        (item.eval.overallScore === existing.eval.overallScore &&
          item.timestamp > existing.timestamp)
      ) {
        bestByCandidate.set(key, item);
      }
    }
    return Array.from(bestByCandidate.values())
      .sort((a, b) => b.eval.overallScore - a.eval.overallScore)
      .slice(0, 5);
  }, [completedItems]);

  // Top 5 Most Interviewed Job Positions (excluding candidate-uploaded custom JDs)
  const { topInterviewedJobs, uploadedJdSummary } = useMemo(() => {
    const isCustomUploadedJd = (title: string) => {
      const norm = title.trim().toLowerCase();
      return (
        norm === "jd ứng viên tự tải lên" ||
        norm === "uploaded jd" ||
        norm === "custom jd" ||
        norm === "vị trí phỏng vấn"
      );
    };

    const map = new Map<
      string,
      { title: string; count: number; scoreSum: number; scoredCount: number }
    >();
    const uploaded = { count: 0, scoreSum: 0, scoredCount: 0 };

    evaluated.forEach((item) => {
      const key = item.jobTitle.trim() || "Vị trí phỏng vấn";
      if (isCustomUploadedJd(key)) {
        uploaded.count += 1;
        if (item.isCompleted) {
          uploaded.scoreSum += item.eval.overallScore;
          uploaded.scoredCount += 1;
        }
        return;
      }
      const prev = map.get(key) || {
        title: key,
        count: 0,
        scoreSum: 0,
        scoredCount: 0,
      };
      prev.count += 1;
      if (item.isCompleted) {
        prev.scoreSum += item.eval.overallScore;
        prev.scoredCount += 1;
      }
      map.set(key, prev);
    });

    const ranked = Array.from(map.values())
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const avgA = a.scoredCount > 0 ? a.scoreSum / a.scoredCount : -1;
        const avgB = b.scoredCount > 0 ? b.scoreSum / b.scoredCount : -1;
        return avgB - avgA;
      })
      .slice(0, 5);

    return { topInterviewedJobs: ranked, uploadedJdSummary: uploaded };
  }, [evaluated]);

  // Compact latest 6 rows for Dashboard overview (full search/filter lives on /admin/interviews)
  const tableRows = evaluated.slice(0, 6).map((item, idx) => {
    const s = item.session;
    const pName = item.candidateName;
    const initials = getAvatarInitials(pName, "UV");
    const role = item.jobTitle;
    const dateStr = s.created_at
      ? new Date(s.created_at).toLocaleDateString("vi-VN")
      : "Gần đây";

    return {
      id: s.session_id || String(idx),
      candidateName: pName,
      candidateInitials: initials,
      jobTitle: role,
      dateLabel: dateStr,
      timestamp: item.timestamp,
      status: item.isCompleted
        ? ("completed" as const)
        : ("processing" as const),
      statusLabel: item.isCompleted ? "Hoàn thành" : "Chưa hoàn thành",
      score: item.isCompleted ? item.eval.overallScore : null,
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
    <AdminAppShell page="dashboard" go={go}>
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
          <StatCard
            label="Tổng phiên phỏng vấn"
            value={evaluated.length}
            subtitle={`${completedCount} hoàn thành · ${Math.max(0, evaluated.length - completedCount)} chưa xong`}
            icon={Video}
            onClick={() => go("interviews")}
            actionTitle="Xem danh sách phỏng vấn"
          />
          <StatCard
            label="Tỷ lệ hoàn thành"
            value={`${completionRate}%`}
            subtitle={`${completedCount} / ${evaluated.length} phiên đã hoàn tất`}
            badgeText={completionRate >= 70 ? "Ổn định" : undefined}
            badgeTone="success"
            icon={CheckCircle2}
            onClick={() => go("interviews")}
            actionTitle="Xem tiến độ phiên"
          />
          <StatCard
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
          <StatCard
            label="Điểm AI trung bình"
            value={avgScore}
            subtitle={
              scoredList.length > 0
                ? `Cao nhất ${maxScore} · Thấp nhất ${minScore} (/100)`
                : "Chưa có phiên hoàn thành"
            }
            badgeText={avgScoreMeta?.label}
            badgeTone={avgScoreMeta?.badgeTone ?? "neutral"}
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
            <SectionHeader
              title="Ứng viên điểm cao nhất"
              icon={Trophy}
              iconClassName="text-emerald-600"
              actionLabel="Tất cả ứng viên"
              onAction={() => go("candidates")}
            />

            {topCandidates.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {topCandidates.map((item, idx) => {
                  const initials = getAvatarInitials(item.candidateName, "UV");
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
                        <ScoreBadge
                          score={item.eval.overallScore}
                          mode="pill"
                        />
                        <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-700 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[150px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-[13px] text-zinc-500">
                Chưa có ứng viên nào hoàn thành trong khoảng thời gian này.
              </div>
            )}
          </Card>

          <Card className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-6">
            <SectionHeader
              title="Vị trí được phỏng vấn nhiều nhất"
              icon={BriefcaseBusiness}
              iconClassName="text-emerald-600"
              actionLabel="Tất cả vị trí"
              onAction={() => go("jobs")}
            />

            {topInterviewedJobs.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {topInterviewedJobs.map((job, idx) => {
                  const jobAvg =
                    job.scoredCount > 0
                      ? Math.round(job.scoreSum / job.scoredCount)
                      : null;
                  return (
                    <button
                      key={job.title}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/interviews?q=${encodeURIComponent(job.title)}`,
                        )
                      }
                      className="group flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-0 py-3 text-left transition-colors first:pt-1 last:pb-1"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="w-5 shrink-0 text-[12px] font-bold text-zinc-400 tabular-nums">
                          #{idx + 1}
                        </span>
                        <span
                          className="min-w-0 flex-1 truncate text-[13px] font-semibold text-zinc-950 transition-colors group-hover:text-emerald-700"
                          title={job.title}
                        >
                          {job.title}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="whitespace-nowrap text-[12px] text-zinc-500 tabular-nums">
                          <b className="font-semibold text-zinc-900">
                            {job.count}
                          </b>{" "}
                          phiên
                        </span>
                        {jobAvg !== null && (
                          <ScoreBadge
                            score={jobAvg}
                            mode="pill"
                            prefix="TB "
                          />
                        )}
                        <ChevronRight className="h-4 w-4 text-zinc-300 transition-colors group-hover:text-zinc-700" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[150px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-[13px] text-zinc-500">
                Chưa có dữ liệu vị trí tuyển dụng trong khoảng thời gian này.
              </div>
            )}

            {uploadedJdSummary.count > 0 && (
              <div className="mt-auto pt-3">
                <div className="border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/admin/interviews?q=${encodeURIComponent("JD ứng viên tự tải lên")}`,
                      )
                    }
                    className="group flex w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent p-0 text-left text-[12px] text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    <span className="truncate">
                      Ngoài ra có{" "}
                      <strong className="font-semibold text-zinc-700 tabular-nums">
                        {uploadedJdSummary.count} phiên
                      </strong>{" "}
                      từ JD ứng viên tự tải lên
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-zinc-500 transition-colors group-hover:text-emerald-600">
                      Xem <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Row 4: Clean 1-line Recent Sessions Table + Open Vacancies */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RecentSessionsCard
              title="Danh sách phiên phỏng vấn"
              rows={tableRows}
              showCandidateColumn
              showSearch={false}
              enableSort={false}
              enableStatusFilter={false}
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
    </AdminAppShell>
  );
}

function AdminAppShell({
  page,
  go,
  children,
}: {
  page: Page;
  go: (p: Page) => void;
  children: React.ReactNode;
}) {
  return (
    <AppShell role="admin" activeKey={page} onNavigate={(p) => go(p as Page)}>
      {children}
    </AppShell>
  );
}
