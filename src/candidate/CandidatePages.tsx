import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Gauge,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Trophy,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import {
  AppShell,
  FilterToolbar,
  JobCard,
  PageHeader,
  ScoreBadge,
  StatCard,
  getVietnameseDateEyebrow,
} from "@/components/shared";
import { HelpCenterContent } from "@/components/layout/HelpCenterContent";
import { UserScoreProgressCard } from "@/components/dashboard/UserScoreProgressCard";
import { UserSkillRadarCard } from "@/components/dashboard/UserSkillRadarCard";
import { RecentSessionsCard } from "@/components/dashboard/RecentSessionsCard";
import { VacanciesCard } from "@/components/dashboard/VacanciesCard";
import {
  buildSkillRadarData,
  buildUserScoreProgressData,
  evaluateSessions,
  getScoreMeta,
} from "@/utils/dashboardMetrics";
import { deduplicateJobSkills } from "@/utils/scoreMeta";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ReportContent } from "@/components/report/ReportContent";
import { SettingsFormContent } from "@/components/settings/SettingsFormContent";
import { computeAiEvaluation } from "@/utils/aiEvaluation";
import {
  analyzeCv,
  createSessionWithUpload,
  deleteInterviewSession,
  getInterviewSessionById,
  getUserSessions,
  loadCvAnalysis,
  loadInterviewSession,
  saveCvAnalysis,
  saveInterviewSession,
} from "../services/interviewApi";
import {
  fetchRealJobs,
  getCachedRealJobs,
  DbJob,
} from "../services/jobApi";

// Helper to calculate genuine match between candidate's analyzed CV skills and job requirements
function calculateCvSkillMatch(
  jobSkills: string[] = [],
  jobTitle: string = "",
  cvAnalysis: any,
): { matchPercentage: number | null; matchedSkills: string[] } {
  if (!cvAnalysis || !cvAnalysis.extracted_profile) {
    return { matchPercentage: null, matchedSkills: [] };
  }
  const ep = cvAnalysis.extracted_profile;
  const rawSkills: string[] = [
    ...(ep.cv_skills || []).map((s: any) =>
      typeof s === "string" ? s : s?.name || "",
    ),
    ...(ep.technical_skills || []),
    ...(ep.frameworks || []),
    ...(ep.tools || []),
    ep.target_role || "",
  ];
  const candidateSkills = rawSkills
    .filter(Boolean)
    .map((s) => s.trim().toLowerCase());

  if (candidateSkills.length === 0) {
    return { matchPercentage: null, matchedSkills: [] };
  }

  const cleanJobSkills = jobSkills.filter((s) => s && s !== "Dữ liệu thực");
  if (cleanJobSkills.length === 0) {
    const titleLower = jobTitle.toLowerCase();
    const hasMatch = candidateSkills.some(
      (cs) => cs.length > 2 && titleLower.includes(cs),
    );
    return { matchPercentage: hasMatch ? 75 : 50, matchedSkills: [] };
  }

  const matched = cleanJobSkills.filter((js) => {
    const jsLower = js.trim().toLowerCase();
    return candidateSkills.some(
      (cs) => cs.includes(jsLower) || jsLower.includes(cs),
    );
  });

  const pct = Math.min(
    100,
    Math.round((matched.length / cleanJobSkills.length) * 100),
  );
  return { matchPercentage: pct, matchedSkills: matched };
}

function CandidateLayout({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const nav = useNavigate();
  return (
    <AppShell role="user" activeKey={active} onNavigate={(path) => nav(path)}>
      {children}
    </AppShell>
  );
}

export function CandidateHome() {
  const nav = useNavigate();
  const { user } = useAuth();
  const localSession = loadInterviewSession();

  const uid =
    user?.user_id_num ||
    user?.id ||
    localStorage.getItem("current_user_id") ||
    "1";
  const cacheKey = `user_db_sessions_${uid}`;

  // Real user sessions from database (with cache fallback)
  const [sessions, setSessions] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [loadingSessions, setLoadingSessions] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (_) {}
    return true;
  });

  // Real jobs from database
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState<number>(0);

  useEffect(() => {
    const cleanUid =
      user?.user_id_num ||
      user?.id ||
      localStorage.getItem("current_user_id") ||
      1;
    getUserSessions(cleanUid)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setSessions(res);
          try {
            localStorage.setItem(
              `user_db_sessions_${cleanUid}`,
              JSON.stringify(res),
            );
          } catch (_) {}
        }
      })
      .finally(() => setLoadingSessions(false));

    const cvAnalysis = loadCvAnalysis();
    fetchRealJobs().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setTotalJobsCount(list.length);
        const top5 = list.slice(0, 5).map((j) => {
          const { matchPercentage } = calculateCvSkillMatch(
            j.skills,
            j.title,
            cvAnalysis,
          );
          return {
            id: j.id,
            title: j.title,
            company: j.company || "Doanh nghiệp Công nghệ",
            location: j.location || "Việt Nam",
            type: j.level
              ? `Level: ${j.level.toUpperCase()}`
              : "Toàn thời gian",
            match: matchPercentage,
          };
        });
        setRecommendedJobs(top5);
      }
    });
  }, [user]);

  const allSessions =
    sessions && sessions.length > 0
      ? sessions
      : localSession && localSession.turns?.some((t) => t.answer)
        ? [localSession]
        : [];

  const evaluated = evaluateSessions(allSessions, (s) =>
    computeAiEvaluation(s),
  );

  // Latest completed session for KPI & radar (never use incomplete/unscored sessions)
  const latestCompleted = evaluated.find((x) => x.isCompleted) || null;
  const latestEval = latestCompleted?.eval || null;
  const latestScore = latestEval ? latestEval.overallScore : null;
  const latestScoreMeta =
    latestScore !== null ? getScoreMeta(latestScore) : null;

  const progressMetrics = buildUserScoreProgressData(evaluated, 10);
  const highestScore =
    progressMetrics.completedCount > 0 ? progressMetrics.highestScore : null;
  const completedSessionsCount = progressMetrics.completedCount;
  const incompleteSessionsCount = Math.max(
    0,
    allSessions.length - completedSessionsCount,
  );

  const totalAnsweredTurns = evaluated.reduce(
    (sum, item) => sum + item.answeredTurns,
    0,
  );

  const topCompetency =
    latestEval?.competencies?.[0]?.label?.split("&")?.[0]?.trim() || "—";

  const radarSkills = buildSkillRadarData(latestEval?.competencies || []);

  const latestDateLabel = latestCompleted?.session.created_at
    ? `Phiên ngày ${new Date(latestCompleted.session.created_at).toLocaleDateString("vi-VN")}`
    : "Chưa có phiên hoàn thành";

  const tableRows = evaluated.slice(0, 5).map((item, idx) => {
    const s = item.session;
    const dateStr = s.created_at
      ? new Date(s.created_at).toLocaleDateString("vi-VN")
      : "Gần đây";
    return {
      id: s.session_id || String(idx),
      jobTitle: item.jobTitle,
      dateLabel: dateStr,
      timestamp: item.timestamp,
      score: item.isCompleted ? item.eval.overallScore : null,
      status: item.isCompleted
        ? ("completed" as const)
        : ("processing" as const),
      statusLabel: item.isCompleted ? "Hoàn thành" : "Chưa hoàn thành",
      onSelect: () => nav(`/app/results/${s.session_id || "latest"}`),
    };
  });

  const vacancyItems = recommendedJobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    meta: j.location || "",
    matchPercentage: j.match,
    actionLabel: "Phỏng vấn",
    onAction: () => {
      sessionStorage.setItem("candidate_selected_job_id", String(j.id));
      nav("/app/interviews/new");
    },
  }));

  return (
    <CandidateLayout active="/app">
      <PageHeader
        eyebrow={getVietnameseDateEyebrow()}
        title={`Chào buổi sáng, ${user?.name || "Ứng viên"}`}
        description="Quản lý lộ trình luyện tập phỏng vấn và theo dõi tiến bộ qua từng phiên."
        action={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="lg"
              onClick={() => nav("/app/interviews/device-check")}
            >
              Kiểm tra thiết bị
            </Button>
            <Button
              variant="brand"
              size="lg"
              onClick={() => nav("/app/interviews/new")}
            >
              <Plus /> Phỏng vấn mới
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* Row 1: 4 KPI Stat Cards */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Công việc đang mở"
            value={totalJobsCount}
            subtitle="Vị trí đang tuyển dụng"
            icon={BriefcaseBusiness}
            onClick={() => nav("/app/jobs")}
            actionTitle="Khám phá công việc"
          />
          <StatCard
            label="Phỏng vấn hoàn thành"
            value={completedSessionsCount}
            subtitle={
              incompleteSessionsCount > 0
                ? `${incompleteSessionsCount} phiên chưa hoàn thành`
                : completedSessionsCount > 0
                  ? `${totalAnsweredTurns} câu đã trả lời`
                  : "Chưa có phiên nào"
            }
            icon={Video}
            onClick={() => nav("/app/results")}
            actionTitle="Xem lịch sử phỏng vấn"
          />
          <StatCard
            label="Điểm cao nhất"
            value={highestScore !== null ? highestScore : "—"}
            subtitle={
              highestScore !== null
                ? "Thành tích tốt nhất (/100)"
                : "Hoàn thành phiên đầu tiên"
            }
            icon={Trophy}
            onClick={() => nav("/app/results")}
            actionTitle="Xem kết quả chi tiết"
          />
          <StatCard
            label="Điểm gần nhất"
            value={latestScore !== null ? latestScore : "—"}
            subtitle={latestDateLabel}
            badgeText={latestScoreMeta?.label}
            badgeTone={latestScoreMeta?.badgeTone ?? "neutral"}
            icon={Gauge}
            onClick={() =>
              nav(
                latestCompleted?.session.session_id
                  ? `/app/results/${latestCompleted.session.session_id}`
                  : "/app/results",
              )
            }
          />
        </section>

        {/* Row 2: Completed Score Progress Bar Chart + 4-Skill Radar Chart */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <UserScoreProgressCard
              title="Tiến độ điểm phỏng vấn"
              points={progressMetrics.points}
              averageScore={progressMetrics.averageScore}
              summaryStats={[
                { label: "Phiên hoàn thành", value: completedSessionsCount },
                { label: "Câu đã trả lời", value: totalAnsweredTurns },
                { label: "Năng lực nổi bật", value: topCompetency },
              ]}
              loading={loadingSessions}
              onSelectSession={(sid) => nav(`/app/results/${sid}`)}
              onStartInterview={() => nav("/app/interviews/new")}
            />
          </div>
          <div className="lg:col-span-5">
            <UserSkillRadarCard
              title="Chỉ số năng lực"
              skills={radarSkills}
              loading={loadingSessions}
            />
          </div>
        </section>

        {/* Row 3: Recent Activity Table + Recommended Vacancies */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <RecentSessionsCard
              title="Hoạt động phỏng vấn gần đây"
              rows={tableRows}
              showCandidateColumn={false}
              showSearch={false}
              enableSort={false}
              onViewAll={() => nav("/app/results")}
              emptyMessage="Bạn chưa thực hiện phiên phỏng vấn nào."
              emptyAction={{
                label: "Tạo phiên phỏng vấn đầu tiên",
                onClick: () => nav("/app/interviews/new"),
              }}
            />
          </div>
          <div className="lg:col-span-4">
            <VacanciesCard
              title="Công việc đề xuất"
              items={vacancyItems}
              totalCount={totalJobsCount}
              onViewAll={() => nav("/app/jobs")}
            />
          </div>
        </section>
      </div>
    </CandidateLayout>
  );
}

export function CandidateJobs() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    const cvAnalysis = loadCvAnalysis();
    fetchRealJobs()
      .then((realList) => {
        if (realList && realList.length > 0) {
          const mapped = realList.map((j) => {
            const lower = j.title.toLowerCase();
            const detectedSkills: string[] = [];
            if (lower.includes("frontend") || lower.includes("react"))
              detectedSkills.push("React", "TypeScript");
            if (lower.includes("backend") || lower.includes("node"))
              detectedSkills.push("Node.js", "PostgreSQL");
            if (lower.includes("java"))
              detectedSkills.push("Java", "Spring Boot");
            if (lower.includes("devops") || lower.includes("secops"))
              detectedSkills.push("Docker", "CI/CD", "AWS");
            if (
              lower.includes("analyst") ||
              lower.includes("tester") ||
              lower.includes("qa")
            )
              detectedSkills.push("Testing", "SQL", "Agile");
            if (lower.includes("system") || lower.includes("engineer"))
              detectedSkills.push("System Design", "Linux");

            const location = (j.location || "").trim();
            const level = (j.level || "").trim();
            const mergedRaw = [
              ...detectedSkills,
              ...(Array.isArray(j.skills) ? j.skills : []),
            ];
            const finalSkills = deduplicateJobSkills(
              mergedRaw,
              location,
              level,
            );

            const { matchPercentage } = calculateCvSkillMatch(
              finalSkills,
              j.title,
              cvAnalysis,
            );

            return {
              id: j.id,
              title: j.title,
              company: j.company || "Doanh nghiệp Công nghệ",
              location,
              level,
              match: matchPercentage,
              skills: finalSkills,
            };
          });
          setJobs(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const locationOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const j of jobs) {
      if (!j.location) continue;
      // Extract primary city if formatted as "Quận X, Hà Nội"
      const parts = j.location.split(",").map((p: string) => p.trim()).filter(Boolean);
      const city = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      if (!city) continue;
      const key = city.toLowerCase();
      if (!unique.has(key)) unique.set(key, city);
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "vi"));
  }, [jobs]);

  const levelOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const j of jobs) {
      if (!j.level) continue;
      const key = j.level.toLowerCase();
      if (!unique.has(key)) unique.set(key, j.level.toUpperCase());
    }
    return Array.from(unique.values());
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (
        locationFilter !== "all" &&
        !j.location.toLowerCase().includes(locationFilter.toLowerCase())
      ) {
        return false;
      }
      if (
        levelFilter !== "all" &&
        j.level.toLowerCase() !== levelFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.skills.some((s: string) => s.toLowerCase().includes(q))
      );
    });
  }, [jobs, query, locationFilter, levelFilter]);

  const hasActiveFilter =
    Boolean(query.trim()) || locationFilter !== "all" || levelFilter !== "all";

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedJobs = filteredJobs.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <CandidateLayout active="/app/jobs">
      <PageHeader
        title="Công việc"
        description="Chọn vị trí để bắt đầu luyện phỏng vấn."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm kiếm công việc, công ty hoặc kỹ năng..."
            className="h-10 rounded-full bg-white pl-9"
          />
        </div>

        {locationOptions.length > 1 && (
          <Select
            value={locationFilter}
            onValueChange={(val) => {
              setLocationFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Lọc theo địa điểm"
              className="h-10 w-[180px] rounded-full bg-white text-[13px]"
            >
              <SelectValue placeholder="Tất cả địa điểm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả địa điểm</SelectItem>
              {locationOptions.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {levelOptions.length > 0 && (
          <Select
            value={levelFilter}
            onValueChange={(val) => {
              setLevelFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Lọc theo cấp bậc"
              className="h-10 w-[160px] rounded-full bg-white text-[13px]"
            >
              <SelectValue placeholder="Tất cả cấp bậc" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả cấp bậc</SelectItem>
              {levelOptions.map((lvl) => (
                <SelectItem key={lvl} value={lvl}>
                  {lvl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 rounded-full px-3 text-xs text-zinc-500 hover:text-zinc-950"
            onClick={() => {
              setQuery("");
              setLocationFilter("all");
              setLevelFilter("all");
              setCurrentPage(1);
            }}
          >
            <X className="h-3.5 w-3.5" /> Xóa bộ lọc
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Đang tải danh sách công việc...
        </Card>
      ) : paginatedJobs.length === 0 ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          {hasActiveFilter
            ? "Không tìm thấy công việc phù hợp với bộ lọc hiện tại."
            : "Chưa có công việc nào trong hệ thống."}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedJobs.map((j) => (
              <JobCard
                key={j.id}
                title={j.title}
                company={j.company}
                location={j.location}
                level={j.level}
                skills={j.skills}
                footer={
                  <>
                    {j.match !== null ? (
                      <Badge
                        variant="success"
                        className="whitespace-nowrap rounded-full text-[11px]"
                      >
                        Phù hợp {j.match}%
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full px-3.5 text-xs"
                      onClick={() => {
                        sessionStorage.setItem(
                          "candidate_selected_job_id",
                          String(j.id),
                        );
                        nav("/app/interviews/new");
                      }}
                    >
                      Phỏng vấn <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </>
                }
              />
            ))}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredJobs.length}
            pageSize={pageSize}
            itemLabel="vị trí tuyển dụng"
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </CandidateLayout>
  );
}

export function CandidateCreateInterview() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);

  const [selected, setSelected] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("candidate_selected_job_id");
    return saved ? parseInt(saved, 10) : null;
  });
  const [query, setQuery] = useState("");
  const [drag, setDrag] = useState(false);
  const [started, setStarted] = useState(false);
  const [jobList, setJobList] = useState<DbJob[]>(() => getCachedRealJobs());
  const [loading, setLoading] = useState(
    () => getCachedRealJobs().length === 0,
  );
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [numQuestions, setNumQuestions] = useState<number>(5);

  const input = useRef<HTMLInputElement>(null);

  // Custom Job Upload/Input State
  const [jobMode, setJobMode] = useState<"system" | "upload">("system");
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customJdText, setCustomJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdDrag, setJdDrag] = useState(false);
  const jdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRealJobs().then((jobs) => {
      setJobList(jobs);
      setLoading(false);
    });
  }, []);

  const filtered = jobList.filter(
    (j) =>
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.company.toLowerCase().includes(query.toLowerCase()) ||
      j.location.toLowerCase().includes(query.toLowerCase()),
  );

  const selectedJob = jobList.find((j) => j.id === selected);

  const isCustomValid =
    jobMode === "upload" && (customTitle.trim().length > 0 || jdFile !== null);
  const effectiveJob: DbJob | null =
    jobMode === "system"
      ? selectedJob || null
      : isCustomValid
        ? {
            id: -999,
            title:
              customTitle.trim() ||
              (jdFile
                ? jdFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ")
                : "Vị trí tùy chỉnh"),
            company: customCompany.trim() || "Doanh nghiệp ngoài hệ thống",
            location: "Tùy chỉnh",
            level: "Bên ngoài",
            accent: "#e11d48",
            skills: ["Job tùy chỉnh", "JD ngoài hệ thống"],
          }
        : null;

  const hasCvSelected = file !== null;
  const hasJobSelected = Boolean(effectiveJob);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleJdFileChange = (uploadedFile: File | null) => {
    setJdFile(uploadedFile);
    if (uploadedFile && !customTitle) {
      const cleanName = uploadedFile.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ");
      setCustomTitle(cleanName);
    }
  };

  // TRIGGER REAL AI SESSION CREATION
  const handleStart = async () => {
    if (!hasCvSelected || !effectiveJob) return;
    setCreatingSession(true);
    setSessionError("");

    sessionStorage.removeItem("current_session_id");
    sessionStorage.removeItem("current_question_text");
    sessionStorage.removeItem("current_question_criterion");
    sessionStorage.removeItem("current_question_stage");
    sessionStorage.removeItem("current_turn_index");
    sessionStorage.removeItem("last_turn_scores");
    sessionStorage.removeItem("last_turn_question");
    sessionStorage.removeItem("last_turn_answer");
    sessionStorage.removeItem("interview_completed");

    try {
      if (file) {
        const jdDesc =
          customJdText ||
          (effectiveJob.skills ? effectiveJob.skills.join(", ") : "") ||
          effectiveJob.title;
        analyzeCv(file, jdDesc)
          .then((analysis) => saveCvAnalysis(analysis))
          .catch((err) => console.warn("CV analysis background task:", err));
      }

      const session = await createSessionWithUpload({
        cvFile: file,
        cvId: null,
        jobId: jobMode === "system" ? selectedJob?.id : null,
        jdFile: jobMode === "upload" ? jdFile : null,
        jdText: jobMode === "upload" ? customJdText : null,
        jobTitle: effectiveJob.title,
        jobCompany: effectiveJob.company,
        maxQuestions: numQuestions,
        userId: user?.user_id_num || user?.id,
      });

      if (session && session.session_id) {
        saveInterviewSession(session);
        sessionStorage.setItem("current_session_id", session.session_id);
        if (session.current_question) {
          sessionStorage.setItem(
            "current_question_text",
            session.current_question.question,
          );
          sessionStorage.setItem(
            "current_question_criterion",
            session.current_question.criterion || "Chuyên môn",
          );
          sessionStorage.setItem(
            "current_question_stage",
            session.current_question.stage || "introduction",
          );
        }
        sessionStorage.setItem("current_turn_index", "0");
        sessionStorage.setItem(
          "total_questions",
          String(session.max_questions || numQuestions),
        );
        sessionStorage.removeItem("interview_turns_history");
        sessionStorage.setItem("selected_job_title", effectiveJob.title);
        sessionStorage.setItem("selected_job_company", effectiveJob.company);
        if (file) {
          sessionStorage.setItem("selected_cv_name", file.name);
        }
      }
      setStarted(true);
    } catch (err: any) {
      console.error("Session create failed:", err);
      setSessionError(
        err.message || "Không thể tạo phiên phỏng vấn từ AI. Vui lòng thử lại.",
      );
    } finally {
      setCreatingSession(false);
    }
  };

  if (started) {
    return (
      <CandidateLayout active="/app/interviews/new">
        <div className="mx-auto max-w-xl py-8">
          <Card className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
              <Check className="h-7 w-7" />
            </div>
            <Badge variant="success" className="mb-3 rounded-full px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> SẴN SÀNG PHỎNG VẤN
            </Badge>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-zinc-950">
              Bộ câu hỏi đã được tạo riêng cho bạn
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">
              Hệ thống đã phân tích hồ sơ CV của bạn và đối chiếu với vị trí{" "}
              <b className="text-zinc-900">{effectiveJob?.title}</b> (
              {effectiveJob?.company}) để chuẩn bị bộ {numQuestions} câu hỏi sát
              thực tế nhất.
            </p>

            <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Hồ sơ ứng viên & Vị trí</span>
                <span className="font-semibold text-emerald-600">Hoàn tất</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full w-full rounded-full bg-emerald-600" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Bộ câu hỏi AI</span>
                <span className="font-semibold text-zinc-900">
                  Đã tuyển chọn ({numQuestions} câu)
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                variant="brand"
                size="lg"
                className="h-11 w-full"
                onClick={() => nav("/app/interviews/device-check")}
              >
                Vào kiểm tra thiết bị & phỏng vấn ngay{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-10 w-full"
                onClick={() => setStarted(false)}
              >
                Quay lại chỉnh sửa hồ sơ
              </Button>
            </div>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout active="/app/interviews/new">
      <PageHeader
        title="Tạo phỏng vấn mới"
        description="Tải lên CV và chọn vị trí tuyển dụng để bắt đầu buổi phỏng vấn."
      />

      {/* Stepper */}
      <Card className="mb-6 rounded-2xl border border-zinc-200 bg-white px-5 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              step: 1,
              title: "Hồ sơ ứng viên",
              subtitle: "Tải lên CV của bạn",
              done: hasCvSelected,
              active: !hasCvSelected,
            },
            {
              step: 2,
              title: "Chọn công việc",
              subtitle: "Vị trí ứng tuyển",
              done: hasJobSelected,
              active: hasCvSelected && !hasJobSelected,
            },
            {
              step: 3,
              title: "Cấu hình phiên",
              subtitle: "Số lượng câu hỏi",
              done: hasCvSelected && hasJobSelected,
              active: hasCvSelected && hasJobSelected,
            },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div
                className={
                  item.done
                    ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
                    : item.active
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500"
                }
              >
                {item.done ? <Check className="h-4 w-4" /> : item.step}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-950">
                  {item.title}
                </div>
                <div className="text-xs text-zinc-500">{item.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          {/* Section 01: CV */}
          <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                  01
                </span>
                <div>
                  <h2 className="m-0 text-base font-semibold text-zinc-950">
                    Hồ sơ ứng viên
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-zinc-500">
                    Tải lên tệp CV của bạn (PDF, DOCX, TXT) để hệ thống phân tích
                    và đặt câu hỏi phù hợp.
                  </p>
                </div>
              </div>
              {hasCvSelected && (
                <Badge variant="success" className="shrink-0 rounded-full">
                  <Check className="h-3 w-3" /> Hoàn tất
                </Badge>
              )}
            </div>

            {!file ? (
              <div
                className={
                  drag
                    ? "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/40 px-6 py-10 text-center transition-colors"
                    : "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-10 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={drop}
                onClick={() => input.current?.click()}
              >
                <input
                  ref={input}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                  }}
                />
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <h3 className="m-0 text-sm font-semibold text-zinc-950">
                  Kéo & thả CV của bạn vào đây
                </h3>
                <p className="m-0 mt-1 text-xs text-zinc-500">
                  hoặc{" "}
                  <span className="font-semibold text-emerald-600">
                    chọn tệp từ máy tính
                  </span>
                </p>
                <small className="mt-2 text-[11px] text-zinc-400">
                  Hỗ trợ PDF, DOCX, TXT · Tối đa 10MB
                </small>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-zinc-950">
                    {file.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng để AI
                    đọc & sinh câu hỏi riêng
                  </div>
                </div>
                <Badge variant="success" className="rounded-full">
                  <Check className="h-3 w-3" /> Sẵn sàng
                </Badge>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Xóa tệp CV"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </Card>

          {/* Section 02: Job Selection or Custom Upload */}
          <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                  02
                </span>
                <div>
                  <h2 className="m-0 text-base font-semibold text-zinc-950">
                    Chọn vị trí tuyển dụng
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-zinc-500">
                    Chọn công việc có sẵn từ hệ thống hoặc tải lên bản mô tả
                    công việc (JD) bên ngoài.
                  </p>
                </div>
              </div>
              {hasJobSelected && (
                <Badge variant="success" className="shrink-0 rounded-full">
                  <Check className="h-3 w-3" /> Hoàn tất
                </Badge>
              )}
            </div>

            <Tabs
              value={jobMode}
              onValueChange={(v) => setJobMode(v as "system" | "upload")}
              className="mb-4"
            >
              <TabsList>
                <TabsTrigger value="system" className="gap-1.5">
                  Chọn từ kho dữ liệu
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-1.5">
                  Tải lên / Nhập Job ngoài
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {jobMode === "system" ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên vị trí, công ty hoặc địa điểm..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-10 rounded-full pl-9"
                  />
                </div>
                {loading ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 py-10 text-center text-sm text-zinc-500">
                    Đang tải danh sách công việc...
                  </div>
                ) : (
                  <div className="max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
                    {filtered.map((job) => {
                      const isSel = selected === job.id;
                      const initials = (job.company || job.title)
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join("")
                        .toUpperCase();
                      const cleanSkills = (job.skills || []).filter(
                        (s) => s && s !== "Dữ liệu thực",
                      );
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => setSelected(job.id)}
                          className={
                            isSel
                              ? "flex w-full items-center gap-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 p-3.5 text-left transition-colors cursor-pointer"
                              : "flex w-full items-center gap-3.5 rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50/60 cursor-pointer"
                          }
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold text-white">
                            {initials || "JB"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-zinc-950">
                              {job.title}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-zinc-500">
                              {job.company} · {job.location}
                            </div>
                            {cleanSkills.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {cleanSkills.slice(0, 4).map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="text-[10px] font-normal"
                                  >
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div
                            className={
                              isSel
                                ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
                                : "h-5 w-5 shrink-0 rounded-full border border-zinc-300 bg-white"
                            }
                          >
                            {isSel && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                    {filtered.length === 0 && (
                      <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
                        Không tìm thấy công việc phù hợp với từ khóa "{query}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!jdFile ? (
                  <div
                    className={
                      jdDrag
                        ? "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/40 px-6 py-7 text-center transition-colors"
                        : "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-7 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      setJdDrag(true);
                    }}
                    onDragLeave={() => setJdDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setJdDrag(false);
                      if (e.dataTransfer.files[0])
                        handleJdFileChange(e.dataTransfer.files[0]);
                    }}
                    onClick={() => jdInputRef.current?.click()}
                  >
                    <input
                      ref={jdInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) =>
                        handleJdFileChange(e.target.files?.[0] || null)
                      }
                    />
                    <UploadCloud className="mb-2 h-6 w-6 text-zinc-500" />
                    <div className="text-sm font-semibold text-zinc-900">
                      Kéo & thả file JD (Mô tả công việc) vào đây
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      hoặc{" "}
                      <span className="font-semibold text-emerald-600">
                        chọn tệp từ máy tính
                      </span>{" "}
                      (PDF, DOCX, TXT · Tối đa 10MB)
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-950">
                        {jdFile.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {(jdFile.size / 1024 / 1024).toFixed(2)} MB · File JD đã
                        tiếp nhận
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJdFile(null)}
                      aria-label="Xóa tệp JD"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-900 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-job-title">
                      Tên vị trí tuyển dụng{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="custom-job-title"
                      type="text"
                      placeholder="VD: Senior Backend Engineer, AI Specialist..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-job-company">
                      Tên công ty / Doanh nghiệp
                    </Label>
                    <Input
                      id="custom-job-company"
                      type="text"
                      placeholder="VD: VNG, VinAI, FPT..."
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom-jd-text">
                    Nội dung mô tả công việc (JD)
                  </Label>
                  <Textarea
                    id="custom-jd-text"
                    rows={4}
                    placeholder="Dán nội dung chi tiết bài tuyển dụng, trách nhiệm hoặc kỹ năng yêu cầu vào đây để AI phân tích..."
                    value={customJdText}
                    onChange={(e) => setCustomJdText(e.target.value)}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Section 03: Cấu hình phiên */}
          <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                03
              </span>
              <div>
                <h2 className="m-0 text-base font-semibold text-zinc-950">
                  Cấu hình phiên
                </h2>
                <p className="m-0 mt-0.5 text-xs text-zinc-500">
                  Chọn số lượng câu hỏi cho buổi phỏng vấn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  count: 3,
                  label: "3 câu",
                  time: "~10 phút",
                  desc: "Phỏng vấn nhanh",
                },
                {
                  count: 5,
                  label: "5 câu",
                  time: "~20 phút",
                  desc: "Tiêu chuẩn",
                },
                {
                  count: 8,
                  label: "8 câu",
                  time: "~35 phút",
                  desc: "Đánh giá chuyên sâu",
                },
                {
                  count: 10,
                  label: "10 câu",
                  time: "~45 phút",
                  desc: "Toàn diện kỹ năng",
                },
              ].map((opt) => {
                const active = numQuestions === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setNumQuestions(opt.count)}
                    className={
                      active
                        ? "rounded-xl border-2 border-emerald-600 bg-emerald-50/50 p-3.5 text-left transition-colors cursor-pointer"
                        : "rounded-xl border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer"
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={
                          active
                            ? "text-base font-bold text-emerald-700"
                            : "text-base font-bold text-zinc-950"
                        }
                      >
                        {opt.label}
                      </span>
                      {active && <Check className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div className="mt-1 text-xs font-medium text-zinc-600">
                      {opt.time}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Aside Summary Card */}
        <aside className="lg:col-span-4">
          <Card className="sticky top-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <Badge variant="outline" className="mb-3">
              <ClipboardList className="h-3.5 w-3.5 text-emerald-600" /> TÓM TẮT
            </Badge>
            <h3 className="m-0 text-lg font-semibold text-zinc-950">
              Buổi phỏng vấn của bạn
            </h3>

            <div className="mt-5 space-y-4 divide-y divide-zinc-100">
              <div className={file ? "" : "opacity-65"}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  01 · Hồ sơ (CV)
                </div>
                {file ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-950">
                        {file.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-2.5 text-xs text-zinc-500">
                    Chờ tải lên tệp CV
                  </div>
                )}
              </div>

              <div className={`pt-4 ${effectiveJob ? "" : "opacity-65"}`}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  02 · Vị trí ứng tuyển
                </div>
                {effectiveJob ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                      {effectiveJob.title[0]?.toUpperCase() || "J"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-950">
                        {effectiveJob.title}
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {effectiveJob.company}
                        {jobMode === "upload" ? " · Ngoài hệ thống" : ""}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-2.5 text-xs text-zinc-500">
                    Chờ chọn vị trí ứng tuyển
                  </div>
                )}
              </div>

              <div className="pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  03 · Cấu hình phiên
                </div>
                <div className="mt-1.5 text-sm font-semibold text-zinc-950">
                  {numQuestions} câu hỏi phỏng vấn
                </div>
              </div>
            </div>

            {sessionError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{sessionError}</AlertDescription>
              </Alert>
            )}

            <Button
              variant="brand"
              size="lg"
              className="mt-5 h-11 w-full"
              disabled={!hasCvSelected || !effectiveJob || creatingSession}
              onClick={handleStart}
            >
              {creatingSession
                ? "Đang chuẩn bị bộ câu hỏi..."
                : "Bắt đầu phỏng vấn"}
              {!creatingSession && <ArrowRight className="h-4 w-4" />}
            </Button>
          </Card>
        </aside>
      </div>
    </CandidateLayout>
  );
}

type ResultStatusFilter = "all" | "completed" | "incomplete";
type ResultSortOption = "newest" | "score_desc" | "score_asc";

export function CandidateResults() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const localSession = loadInterviewSession();

  const uid =
    user?.user_id_num ||
    user?.id ||
    localStorage.getItem("current_user_id") ||
    "1";
  const cacheKey = `user_db_sessions_${uid}`;

  const [userDbSessions, setUserDbSessions] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch (_) {}
    return true;
  });

  const [statusFilter, setStatusFilter] = useState<ResultStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ResultSortOption>("newest");
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

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

  useEffect(() => {
    const cleanUid =
      user?.user_id_num ||
      user?.id ||
      localStorage.getItem("current_user_id") ||
      1;
    getUserSessions(cleanUid)
      .then((res) => {
        if (Array.isArray(res)) {
          setUserDbSessions(res);
          try {
            localStorage.setItem(
              `user_db_sessions_${cleanUid}`,
              JSON.stringify(res),
            );
          } catch (_) {}
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [user]);

  const allSessions = useMemo(() => {
    if (userDbSessions.length > 0) return userDbSessions;
    if (localSession && localSession.turns?.some((t) => t.answer)) {
      return [localSession];
    }
    return [];
  }, [userDbSessions, localSession]);

  const evaluated = useMemo(
    () =>
      evaluateSessions(allSessions, (s) => computeAiEvaluation(s)).sort(
        (a, b) => b.timestamp - a.timestamp,
      ),
    [allSessions],
  );

  // Synchronized metrics: count ONLY completed sessions (matches /app exactly)
  const completedItems = useMemo(
    () => evaluated.filter((item) => item.isCompleted),
    [evaluated],
  );
  const incompleteCount = evaluated.length - completedItems.length;
  const latestCompleted = completedItems[0] || null;
  const latestScore = latestCompleted ? latestCompleted.eval.overallScore : null;
  const latestTier = latestScore !== null ? getScoreMeta(latestScore) : null;
  const latestDateSubtitle = latestCompleted?.session.created_at
    ? `Phiên ngày ${new Date(latestCompleted.session.created_at).toLocaleDateString("vi-VN")}`
    : undefined;

  const topComp = latestCompleted?.eval.competencies?.[0] || null;
  const topCompetency = topComp?.label?.split("&")?.[0]?.trim() || null;
  const topScore = topComp ? Math.round(topComp.score) : null;
  const topTier = topScore !== null ? getScoreMeta(topScore) : null;

  // Filter & sort list
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = evaluated.filter((item) => {
      if (statusFilter === "completed" && !item.isCompleted) return false;
      if (statusFilter === "incomplete" && item.isCompleted) return false;
      if (q && !item.jobTitle.toLowerCase().includes(q)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "score_desc") {
        const av = a.isCompleted ? a.eval.overallScore : -1;
        const bv = b.isCompleted ? b.eval.overallScore : -1;
        return bv - av || b.timestamp - a.timestamp;
      }
      if (sortBy === "score_asc") {
        const av = a.isCompleted ? a.eval.overallScore : Number.POSITIVE_INFINITY;
        const bv = b.isCompleted ? b.eval.overallScore : Number.POSITIVE_INFINITY;
        return av - bv || b.timestamp - a.timestamp;
      }
      return b.timestamp - a.timestamp;
    });
  }, [evaluated, statusFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const handleResumeSession = async (sessionId: string) => {
    setActionError("");
    setResumingId(sessionId);
    try {
      const fullSession = await getInterviewSessionById(sessionId);
      if (!fullSession) {
        nav(`/app/results/${sessionId}`);
        return;
      }
      const nextQuestion =
        fullSession.current_question ||
        (() => {
          const unanswered = fullSession.turns?.find((t) => !t.answer);
          return unanswered
            ? {
                turn_index: unanswered.turn_index,
                stage: unanswered.stage,
                question: unanswered.question,
              }
            : null;
        })();

      if (!nextQuestion || fullSession.status === "completed") {
        nav(`/app/results/${sessionId}`);
        return;
      }

      saveInterviewSession({
        ...fullSession,
        current_question: nextQuestion,
      });
      sessionStorage.setItem("current_session_id", fullSession.session_id);
      sessionStorage.setItem("current_question_text", nextQuestion.question);
      sessionStorage.setItem(
        "current_question_criterion",
        (nextQuestion as any).criterion || "Chuyên môn",
      );
      sessionStorage.setItem(
        "current_question_stage",
        nextQuestion.stage || fullSession.current_stage || "Chuyên môn",
      );
      sessionStorage.setItem(
        "current_turn_index",
        String(nextQuestion.turn_index ?? 0),
      );
      sessionStorage.setItem(
        "total_questions",
        String(fullSession.max_questions || 5),
      );
      const jobTitle =
        fullSession.job_profile_json?.title ||
        fullSession.cv_profile_json?.target_role ||
        "";
      if (jobTitle) {
        sessionStorage.setItem("selected_job_title", jobTitle);
      }
      nav("/app/interviews/room");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể tiếp tục phiên phỏng vấn này.",
      );
    } finally {
      setResumingId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string, jobTitle: string) => {
    const confirmed = window.confirm(
      `Xóa phiên phỏng vấn chưa hoàn thành "${jobTitle}"? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setActionError("");
    setDeletingId(sessionId);
    try {
      await deleteInterviewSession(sessionId);
      setUserDbSessions((prev) => {
        const next = prev.filter((item) => item.session_id !== sessionId);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Không thể xóa phiên phỏng vấn. Vui lòng thử lại.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <CandidateLayout active="/app/results">
      <PageHeader
        title="Kết quả của tôi"
        description="Theo dõi sự tiến bộ và chi tiết đánh giá qua từng phiên phỏng vấn."
        action={
          <Button
            variant="brand"
            size="lg"
            onClick={() => nav("/app/interviews/new")}
          >
            <Plus /> Phỏng vấn mới
          </Button>
        }
      />

      <div className="space-y-5">
        {/* 3 Unified KPI Cards */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard
            label="Điểm gần nhất"
            value={latestScore !== null ? latestScore : "—"}
            subtitle={latestDateSubtitle}
            badgeText={latestTier?.label}
            badgeTone={latestTier?.badgeTone ?? "neutral"}
            icon={Gauge}
          />
          <StatCard
            label="Phỏng vấn hoàn thành"
            value={completedItems.length}
            subtitle={
              incompleteCount > 0
                ? `${incompleteCount} phiên chưa hoàn thành`
                : undefined
            }
            icon={CheckCircle2}
          />
          <StatCard
            label="Năng lực nổi bật"
            value={topCompetency || "—"}
            badgeText={topScore !== null ? `${topScore}/100` : undefined}
            badgeTone={topTier?.badgeTone ?? "neutral"}
            icon={Award}
          />
        </section>

        {/* Unified Toolbar: Segmented Status Tabs (Left) + Search & Sort (Right) */}
        {evaluated.length > 0 && (
          <FilterToolbar
            left={
              <div
                role="tablist"
                aria-label="Lọc theo trạng thái phiên phỏng vấn"
                className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-1"
              >
                {(
                  [
                    { id: "all", label: `Tất cả (${evaluated.length})` },
                    {
                      id: "completed",
                      label: `Hoàn thành (${completedItems.length})`,
                    },
                    {
                      id: "incomplete",
                      label: `Chưa hoàn thành (${incompleteCount})`,
                    },
                  ] as { id: ResultStatusFilter; label: string }[]
                ).map((tab) => {
                  const active = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setStatusFilter(tab.id);
                        setCurrentPage(1);
                      }}
                      className={
                        active
                          ? "rounded-lg bg-white px-3 py-1.5 text-[12.5px] font-semibold text-zinc-950 shadow-xs transition-colors cursor-pointer border-0"
                          : "rounded-lg bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-zinc-600 transition-colors hover:text-zinc-950 cursor-pointer border-0"
                      }
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
            right={
              <>
                <div className="relative w-full sm:w-[240px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm theo vị trí phỏng vấn..."
                    className="h-9 rounded-full bg-white pl-8 text-[13px]"
                  />
                </div>

                <Select
                  value={sortBy}
                  onValueChange={(val) => {
                    setSortBy(val as ResultSortOption);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    aria-label="Sắp xếp kết quả"
                    className="h-9 w-[160px] rounded-full bg-white text-[12.5px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                    <SelectItem value="score_desc">Điểm cao nhất</SelectItem>
                    <SelectItem value="score_asc">Điểm thấp nhất</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
          />
        )}

        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Result List */}
        <div className="space-y-3">
          {loading && evaluated.length === 0 ? (
            <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
              Đang tải danh sách kết quả phỏng vấn...
            </Card>
          ) : evaluated.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="m-0 text-base font-semibold text-zinc-950">
                Chưa có phiên phỏng vấn nào
              </h3>
              <p className="m-0 mt-1.5 max-w-sm text-sm text-zinc-500">
                Hãy bắt đầu một buổi phỏng vấn để hệ thống đánh giá năng lực và
                lưu lại kết quả tiến bộ của bạn.
              </p>
              <Button
                variant="brand"
                className="mt-5"
                onClick={() => nav("/app/interviews/new")}
              >
                <Plus /> Tạo phỏng vấn ngay
              </Button>
            </Card>
          ) : paginatedItems.length === 0 ? (
            <Card className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              Không tìm thấy phiên phỏng vấn phù hợp với bộ lọc hiện tại.
            </Card>
          ) : (
            paginatedItems.map((item) => {
              const s = item.session;
              const dateStr = s.created_at
                ? new Date(s.created_at).toLocaleDateString("vi-VN")
                : "Gần đây";
              const maxQ = s.max_questions || 0;
              const score = item.eval.overallScore;
              const isResuming = resumingId === s.session_id;
              const isDeleting = deletingId === s.session_id;

              return (
                <Card
                  key={s.session_id}
                  className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    {item.isCompleted ? (
                      <div
                        title="Đã hoàn thành"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-600"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div
                        title="Chưa hoàn thành"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50 text-amber-600"
                      >
                        <Clock3 className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-zinc-950">
                        {item.jobTitle}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                        <span>{dateStr}</span>
                        <span className="text-zinc-300">·</span>
                        <span>
                          {maxQ > 0
                            ? `${item.answeredTurns}/${maxQ} câu đã trả lời`
                            : `${item.answeredTurns} câu đã trả lời`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    {item.isCompleted ? (
                      <>
                        <div className="flex items-center gap-2.5">
                          <ScoreBadge
                            score={score}
                            mode="pill"
                            display="label"
                          />
                          <ScoreBadge
                            score={score}
                            mode="inline"
                            className="min-w-[60px] justify-end text-xl"
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs"
                          onClick={() =>
                            nav(`/app/results/${s.session_id}`, {
                              state: {
                                returnTo:
                                  safePage > 1
                                    ? `/app/results?page=${safePage}`
                                    : "/app/results",
                              },
                            })
                          }
                        >
                          Xem chi tiết <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          aria-label="Chưa có điểm"
                          className="min-w-[40px] text-right text-lg font-medium text-zinc-400"
                        >
                          —
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isResuming || isDeleting}
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={() => handleResumeSession(s.session_id)}
                          >
                            {isResuming ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Đang mở...
                              </>
                            ) : (
                              <>
                                Tiếp tục <ChevronRight className="h-3.5 w-3.5" />
                              </>
                            )}
                          </Button>

                          <button
                            type="button"
                            disabled={isDeleting || isResuming}
                            onClick={() =>
                              handleDeleteSession(s.session_id, item.jobTitle)
                            }
                            title="Xóa phiên chưa hoàn thành"
                            aria-label="Xóa phiên chưa hoàn thành"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {!loading && filteredItems.length > pageSize && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          itemLabel="phiên phỏng vấn"
          onPageChange={(p) => {
            setCurrentPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </CandidateLayout>
  );
}

export function CandidateResultDetail() {
  const nav = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ||
    "/app/results";
  return (
    <CandidateLayout active="/app/results">
      <div className="candidate-shared-report">
        <ReportContent
          sessionId={id}
          candidateView
          onBack={() => nav(returnTo)}
        />
      </div>
    </CandidateLayout>
  );
}

export function CandidateSettings() {
  return (
    <CandidateLayout active="/app/settings">
      <SettingsFormContent roleLabel="Ứng viên" />
    </CandidateLayout>
  );
}

export function CandidateHelp() {
  return (
    <CandidateLayout active="/app/help">
      <HelpCenterContent />
    </CandidateLayout>
  );
}
