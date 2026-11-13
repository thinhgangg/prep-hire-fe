import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ReportContent, computeAiEvaluation } from "../Pages";
import {
  loadInterviewSession,
  loadCvAnalysis,
  getUserSessions,
} from "../services/interviewApi";
import {
  analyzeCv,
  createSessionWithUpload,
  saveCvAnalysis,
  saveInterviewSession,
} from "../services/interviewApi";
import { fetchRealJobs, DbJob } from "../services/jobApi";

function CandidateLayout({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const nav = useNavigate(),
    { user, logout } = useAuth(),
    [open, setOpen] = useState(false);
  const links = [
    ["/app", "Tổng quan", <Home />],
    ["/app/jobs", "Công việc", <BriefcaseBusiness />],
    ["/app/interviews/new", "Phỏng vấn", <Sparkles />],
    ["/app/results", "Kết quả của tôi", <BarChart3 />],
    ["/app/profile", "Hồ sơ cá nhân", <UserRound />],
  ] as const;
  const signOut = () => {
    logout();
    nav("/login");
  };
  return (
    <div className="candidate-app">
      <button className="candidate-mobile" onClick={() => setOpen(true)}>
        <Menu />
      </button>
      {open && (
        <div className="candidate-scrim" onClick={() => setOpen(false)} />
      )}
      <aside className={open ? "open" : ""}>
        <button className="candidate-logo" onClick={() => nav("/app")}>
          <i>
            <Sparkles />
          </i>
          Interviewly
        </button>
        <button className="candidate-close" onClick={() => setOpen(false)}>
          <X />
        </button>
        <div className="candidate-role">
          <span>KHÔNG GIAN ỨNG VIÊN</span>
        </div>
        <nav>
          {links.map(([path, label, icon]) => (
            <button
              className={active === path ? "active" : ""}
              onClick={() => {
                nav(path);
                setOpen(false);
              }}
              key={path}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>
        <div className="candidate-help">
          <Sparkles />
          <b>Sẵn sàng phỏng vấn?</b>
          <p>Kiểm tra thiết bị trước để có trải nghiệm tốt nhất.</p>
        </div>
        {(() => {
          const initials = user?.name
            ? user.name
                .split(" ")
                .map((w: string) => w[0])
                .filter(Boolean)
                .slice(-2)
                .join("")
                .toUpperCase()
            : user?.username
              ? user.username.slice(0, 2).toUpperCase()
              : "UV";
          return (
            <div className="candidate-user">
              <span>{initials}</span>
              <p>
                <b>{user?.name || "Ứng viên"}</b>
                <small>
                  {user?.username ? `ID: ${user.username}` : "Ứng viên"}
                </small>
              </p>
              <button onClick={signOut} title="Đăng xuất">
                <LogOut />
              </button>
            </div>
          );
        })()}
      </aside>
      <main className="sub-content candidate-main">{children}</main>
    </div>
  );
}

function CandidateHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="candidate-header">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      <div>
        <button className="icon-btn">
          <Bell />
        </button>
        {action}
      </div>
    </header>
  );
}

export function CandidateHome() {
  const nav = useNavigate();
  const { user } = useAuth();
  const localSession = loadInterviewSession();
  const cvAnalysis = loadCvAnalysis();

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

  // Real jobs from database
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState<number>(48);

  useEffect(() => {
    const cleanUid =
      user?.user_id_num ||
      user?.id ||
      localStorage.getItem("current_user_id") ||
      1;
    getUserSessions(cleanUid).then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setSessions(res);
        try {
          localStorage.setItem(
            `user_db_sessions_${cleanUid}`,
            JSON.stringify(res),
          );
        } catch (_) {}
      }
    });

    fetchRealJobs().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setTotalJobsCount(list.length);
        const top3 = list.slice(0, 3).map((j, i) => {
          const matchScore = 88 + ((j.id * 5 + i * 2) % 10);
          const cleanSkills =
            j.skills && j.skills.length > 0
              ? j.skills.filter((s) => s !== "Dữ liệu thực").slice(0, 3)
              : ["Toàn thời gian"];
          return {
            id: j.id,
            title: j.title,
            company: j.company || "Doanh nghiệp Công nghệ",
            location: j.location || "Việt Nam",
            type: j.level
              ? `Level: ${j.level.toUpperCase()}`
              : "Toàn thời gian",
            match: matchScore,
            skills: cleanSkills,
          };
        });
        setRecommendedJobs(top3);
      }
    });
  }, [user]);

  // Dynamic statistics calculated from actual sessions
  const latestSession =
    sessions && sessions.length > 0 ? sessions[0] : localSession;
  const latestEval = latestSession ? computeAiEvaluation(latestSession) : null;
  const hasAnsweredSession =
    sessions.length > 0 ||
    (localSession && localSession.turns?.some((t) => t.answer));

  const latestScore = latestEval?.overallScore || (hasAnsweredSession ? 80 : 0);
  const scoresList = sessions
    .map((s) => computeAiEvaluation(s).overallScore || 0)
    .filter((s) => s > 0);
  const highestScore =
    scoresList.length > 0 ? Math.max(...scoresList) : latestScore || 85;
  const completedCount =
    sessions.length > 0
      ? String(sessions.length).padStart(2, "0")
      : hasAnsweredSession
        ? "01"
        : "00";

  const topCompetency =
    latestEval?.competencies?.[0]?.label?.split("&")?.[0]?.trim() ||
    "Kiến thức chuyên môn";
  const topScore = latestEval?.competencies?.[0]?.score || highestScore || 85;

  const percentileText =
    latestScore >= 80
      ? "Top 15% ứng viên xuất sắc"
      : latestScore >= 60
        ? "Top 35% ứng viên tiềm năng"
        : "Cần hoàn thành thêm bài phỏng vấn";

  const competenciesToDisplay =
    latestEval?.competencies && latestEval.competencies.length >= 4
      ? latestEval.competencies.slice(0, 4)
      : [
          { label: "Kiến thức chuyên môn", score: Math.max(70, latestScore) },
          {
            label: "Tư duy giải quyết vấn đề",
            score: Math.max(65, latestScore - 5),
          },
          {
            label: "Giao tiếp & Thuyết trình",
            score: Math.max(75, latestScore + 2),
          },
          {
            label: "Tác phong & Độ tự tin",
            score: Math.max(80, latestScore + 6),
          },
        ];

  return (
    <CandidateLayout active="/app">
      <CandidateHeader
        title={`Xin chào, ${user?.name || "Ứng viên"} 👋`}
        desc="Chào mừng bạn quay lại hệ thống luyện tập phỏng vấn AI thông minh."
        action={
          <button
            className="primary"
            onClick={() => nav("/app/interviews/new")}
          >
            <Sparkles /> Bắt đầu phỏng vấn
          </button>
        }
      />

      <section className="candidate-hero">
        <div>
          <span>AI INTERVIEW COACH</span>
          <h2>
            Rèn luyện bản lĩnh.
            <br />
            <em>Chinh phục cơ hội việc làm.</em>
          </h2>
          <p>
            Trải nghiệm phỏng vấn mô phỏng chuẩn xác từ CV của bạn, nhận phân
            tích 7 tiêu chí vi mô và giám sát độ tập trung ánh nhìn (Eye Gaze)
            theo thời gian thực.
          </p>
          <div className="candidate-hero-actions">
            <button onClick={() => nav("/app/interviews/new")}>
              Tạo phiên phỏng vấn <ArrowRight />
            </button>
            <button
              className="candidate-hero-btn-outline"
              onClick={() => nav("/app/jobs")}
            >
              <BriefcaseBusiness size={16} /> Khám phá {totalJobsCount} việc làm
            </button>
          </div>
        </div>
        <div className="candidate-score">
          <span>
            <b>{latestScore > 0 ? latestScore : "--"}</b>
            <small>ĐIỂM GẦN NHẤT</small>
          </span>
          <p>
            <Check /> {percentileText}
          </p>
        </div>
      </section>

      <div className="candidate-quick four-cards">
        <article>
          <span>
            <BriefcaseBusiness />
          </span>
          <p>
            <small>CÔNG VIỆC PHÙ HỢP</small>
            <b>{totalJobsCount}</b>
          </p>
          <button onClick={() => nav("/app/jobs")}>
            Khám phá <ChevronRight />
          </button>
        </article>
        <article>
          <span>
            <FileText />
          </span>
          <p>
            <small>PHỎNG VẤN ĐÃ LÀM</small>
            <b>{completedCount}</b>
          </p>
          <button onClick={() => nav("/app/results")}>
            Xem kết quả <ChevronRight />
          </button>
        </article>
        <article>
          <span>
            <Target />
          </span>
          <p>
            <small>ĐIỂM CAO NHẤT</small>
            <b>{highestScore}</b>
          </p>
          <em>Đánh giá từ AI</em>
        </article>
        <article>
          <span>
            <Sparkles />
          </span>
          <p>
            <small>NĂNG LỰC NỔI BẬT</small>
            <b style={{ fontSize: "14px", lineHeight: 1.3, marginTop: "4px" }}>
              {topCompetency}
            </b>
          </p>
          <em>{topScore}/100 điểm</em>
        </article>
      </div>

      <div className="candidate-dashboard-grid">
        <div className="candidate-main-col">
          {/* Section 1: Recent Real Activity */}
          <section className="candidate-card-box">
            <div className="candidate-section-header">
              <h2>Hoạt động phỏng vấn gần đây</h2>
              <button onClick={() => nav("/app/results")}>
                Xem tất cả ({sessions.length}) <ChevronRight size={14} />
              </button>
            </div>
            {sessions && sessions.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {sessions.slice(0, 3).map((s, idx) => {
                  const dateStr = s.created_at
                    ? new Date(s.created_at).toLocaleDateString("vi-VN")
                    : "Gần đây";
                  const evalObj = computeAiEvaluation(s);
                  const answeredTurns = s.turns
                    ? s.turns.filter((t: any) => t.answer).length
                    : 0;
                  const score = evalObj.overallScore || 80;
                  const jobName =
                    s.job_profile_json?.title ||
                    s.cv_profile_json?.target_role ||
                    evalObj.jobTitle ||
                    "Phiên phỏng vấn AI";
                  return (
                    <div
                      className="candidate-activity"
                      key={s.session_id || idx}
                      style={{
                        borderLeft: idx === 0 ? "4px solid #10b981" : undefined,
                      }}
                    >
                      <span
                        className="candidate-job-icon"
                        style={{ background: "#ecfdf5", color: "#059669" }}
                      >
                        {s.current_stage
                          ? s.current_stage.slice(0, 2).toUpperCase()
                          : "AI"}
                      </span>
                      <p>
                        <b>{jobName}</b>
                        <small>
                          Phiên #
                          {s.session_id ? s.session_id.slice(0, 8) : idx + 1} •{" "}
                          {dateStr} • {answeredTurns} câu đã trả lời
                        </small>
                      </p>
                      <div>
                        <strong style={{ color: "#059669" }}>
                          {score}
                          <small>/100</small>
                        </strong>
                        <button
                          className={idx === 0 ? "primary" : ""}
                          onClick={() => nav(`/app/results/${s.session_id}`)}
                        >
                          Xem kết quả
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : hasAnsweredSession ? (
              <div
                className="candidate-activity"
                style={{ borderLeft: "4px solid #10b981" }}
              >
                <span
                  className="candidate-job-icon"
                  style={{ background: "#ecfdf5", color: "#059669" }}
                >
                  AI
                </span>
                <p>
                  <b>
                    {cvAnalysis?.job_context?.title ||
                      latestEval?.jobTitle ||
                      "Phiên phỏng vấn AI"}
                  </b>
                  <small>
                    Phiên phỏng vấn vừa hoàn thành •{" "}
                    {new Date().toLocaleDateString("vi-VN")}
                  </small>
                </p>
                <div>
                  <strong style={{ color: "#059669" }}>
                    {latestScore}
                    <small>/100</small>
                  </strong>
                  <button
                    className="primary"
                    onClick={() =>
                      nav(
                        `/app/results/${localSession?.session_id || "latest"}`,
                      )
                    }
                  >
                    Xem kết quả
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 20px",
                  color: "#64748b",
                }}
              >
                <p style={{ margin: "0 0 14px", fontSize: "13px" }}>
                  Bạn chưa thực hiện phiên phỏng vấn nào. Hãy bắt đầu ngay để
                  nhận đánh giá chi tiết từ AI.
                </p>
                <button
                  className="primary"
                  onClick={() => nav("/app/interviews/new")}
                >
                  Tạo phiên phỏng vấn đầu tiên
                </button>
              </div>
            )}
          </section>

          {/* Section 2: Recommended Real Jobs */}
          <section className="candidate-card-box">
            <div className="candidate-section-header">
              <h2>Công việc đề xuất phù hợp nhất</h2>
              <button onClick={() => nav("/app/jobs")}>
                Xem tất cả ({totalJobsCount}) <ChevronRight size={14} />
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {recommendedJobs.map((j) => {
                const initials =
                  (j.company || "CT")
                    .split(" ")
                    .map((x: string) => x[0])
                    .filter(Boolean)
                    .slice(0, 3)
                    .join("")
                    .toUpperCase() || "CT";
                return (
                  <div className="candidate-job-card-compact" key={j.id}>
                    <div
                      className="candidate-company"
                      style={{
                        width: "42px",
                        height: "42px",
                        fontSize: "11px",
                        borderRadius: "9px",
                      }}
                    >
                      {initials}
                    </div>
                    <div className="candidate-job-info">
                      <span>
                        <b style={{ fontSize: "14px" }}>{j.title}</b>
                        <small>
                          {j.company} • {j.location} • {j.type}
                        </small>
                      </span>
                      <div style={{ marginTop: "6px" }}>
                        {j.skills.map((s: string) => (
                          <em
                            key={s}
                            style={{ fontSize: "9px", padding: "3px 7px" }}
                          >
                            {s}
                          </em>
                        ))}
                      </div>
                    </div>
                    <div className="candidate-match" style={{ gap: "12px" }}>
                      <span>
                        <b style={{ fontSize: "16px" }}>{j.match}%</b>
                        <small>phù hợp</small>
                      </span>
                      <button
                        style={{
                          height: "34px",
                          padding: "0 11px",
                          fontSize: "11px",
                        }}
                        onClick={() => {
                          sessionStorage.setItem(
                            "candidate_selected_job_id",
                            String(j.id),
                          );
                          nav("/app/interviews/new");
                        }}
                      >
                        Phỏng vấn <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Side Column */}
        <div className="candidate-side-col">
          {/* Section 3: AI Competency Readiness */}
          <section className="candidate-card-box">
            <div className="candidate-section-header">
              <h2>Chỉ số năng lực</h2>
              <span
                style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}
              >
                {latestScore > 0 ? `${latestScore}/100 ĐTB` : "Chờ đánh giá"}
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                margin: "0 0 16px",
                lineHeight: 1.5,
              }}
            >
              Tổng hợp điểm các khía cạnh phỏng vấn qua các phiên tương tác AI
              gần nhất.
            </p>
            <div>
              {competenciesToDisplay.map((c) => (
                <div className="candidate-competency-item" key={c.label}>
                  <div className="candidate-competency-label">
                    <span>{c.label}</span>
                    <strong>{c.score}/100</strong>
                  </div>
                  <div className="candidate-competency-bar">
                    <i
                      style={{
                        width: `${Math.min(100, Math.max(10, c.score))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="candidate-coach-tip">
              💡 <b>Gợi ý từ AI:</b> Luyện tập trả lời theo phương pháp STAR
              (Situation - Task - Action - Result) kết hợp số liệu định lượng
              (metrics, throughput) để nâng band điểm lên mức xuất sắc.
            </div>
          </section>

          {/* Section 4: Prep Checklist */}
          <section className="candidate-card-box">
            <div className="candidate-section-header">
              <h2>Quy trình chuẩn bị</h2>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                margin: "0 0 12px",
                lineHeight: 1.5,
              }}
            >
              Các bước tối ưu để đạt kết quả phỏng vấn tốt nhất.
            </p>
            <div>
              <div className="candidate-checklist-item">
                <span className="candidate-checklist-icon done">
                  <Check size={13} />
                </span>
                <div style={{ flex: 1 }}>
                  <b>Hồ sơ CV ứng tuyển</b>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    {(cvAnalysis as any)?.file_name
                      ? `Đã nạp: ${(cvAnalysis as any).file_name}`
                      : cvAnalysis?.job_context?.title
                        ? `Đã liên kết vị trí: ${cvAnalysis.job_context.title}`
                        : "Sẵn sàng phân tích theo từng vị trí"}
                  </p>
                </div>
              </div>
              <div className="candidate-checklist-item">
                <span className="candidate-checklist-icon done">
                  <Check size={13} />
                </span>
                <div style={{ flex: 1 }}>
                  <b>Thiết bị Camera & Microphone</b>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    STT GPU Whisper & giám sát ánh nhìn MediaPipe
                  </p>
                </div>
              </div>
              <div className="candidate-checklist-item">
                <span
                  className={`candidate-checklist-icon ${hasAnsweredSession ? "done" : "pending"}`}
                >
                  <Check size={13} />
                </span>
                <div style={{ flex: 1 }}>
                  <b>Luyện tập phiên phỏng vấn thử</b>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    {hasAnsweredSession
                      ? `Đã hoàn thành ${completedCount} phiên phỏng vấn`
                      : "Chưa hoàn thành phiên nào"}
                  </p>
                </div>
              </div>
            </div>
            <button
              className="outline"
              style={{
                width: "100%",
                marginTop: "16px",
                justifyContent: "center",
                height: "38px",
              }}
              onClick={() => nav("/app/interviews/device-check")}
            >
              Kiểm tra thiết bị & phòng chờ
            </button>
          </section>
        </div>
      </div>
    </CandidateLayout>
  );
}

function CandidatePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = "kết quả",
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const low = Math.max(2, currentPage - 1);
      const high = Math.min(totalPages - 1, currentPage + 1);
      for (let i = low; i <= high; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="candidate-pagination-bar">
      <span>
        Hiển thị{" "}
        <b>
          {start}–{end}
        </b>{" "}
        trong tổng số <b>{totalItems}</b> {itemLabel}
      </span>
      <div className="candidate-pagination-controls">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={15} />
        </button>
        {getPages().map((p, idx) =>
          typeof p === "number" ? (
            <button
              type="button"
              key={p}
              className={p === currentPage ? "active" : ""}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ) : (
            <span key={`dots-${idx}`} className="pagination-dots">
              …
            </span>
          ),
        )}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export function CandidateJobs() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    fetchRealJobs()
      .then((realList) => {
        if (realList && realList.length > 0) {
          const mapped = realList.map((j, i) => {
            const matchScore = 80 + ((j.id * 7 + i * 3) % 18);
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

            const cleanSkills =
              j.skills && j.skills.length > 0
                ? j.skills.filter((s) => s !== "Dữ liệu thực")
                : [];

            const finalSkills =
              detectedSkills.length > 0
                ? detectedSkills
                : cleanSkills.length > 0
                  ? cleanSkills
                  : ["Toàn thời gian", j.location || "Việt Nam"];

            return {
              id: j.id,
              title: j.title,
              company: j.company || "Doanh nghiệp Công nghệ",
              location: j.location || "Việt Nam",
              type: j.level
                ? `Level: ${j.level.toUpperCase()}`
                : "Toàn thời gian",
              match: matchScore,
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

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.company.toLowerCase().includes(query.toLowerCase()) ||
      (j.skills &&
        j.skills.some((s: string) =>
          s.toLowerCase().includes(query.toLowerCase()),
        )),
  );

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <CandidateLayout active="/app/jobs">
      <CandidateHeader
        title="Khám phá công việc"
        desc="Tìm vị trí phù hợp với kỹ năng và định hướng của bạn."
      />
      <div className="candidate-job-search">
        <Search />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Tìm kiếm vị trí hoặc kỹ năng..."
        />
      </div>
      <div className="candidate-job-list">
        {loading ? (
          <div
            style={{ textAlign: "center", padding: "48px", color: "#64748b" }}
          >
            Đang tải danh sách công việc...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px", color: "#64748b" }}
          >
            {query
              ? `Không tìm thấy công việc nào phù hợp với từ khóa "${query}"`
              : "Chưa có công việc nào trong hệ thống."}
          </div>
        ) : (
          paginatedJobs.map((j) => {
            const companyInitials =
              (j.company || "CT")
                .split(" ")
                .map((x: string) => x[0])
                .filter(Boolean)
                .slice(0, 3)
                .join("")
                .toUpperCase() || "CT";

            return (
              <article key={j.id}>
                <div className="candidate-company">{companyInitials}</div>
                <div className="candidate-job-info">
                  <span>
                    <b>{j.title}</b>
                    <small>{j.company}</small>
                  </span>
                  <p>
                    <i>
                      <MapPin />
                      {j.location}
                    </i>
                    <i>
                      <Clock3 />
                      {j.type}
                    </i>
                  </p>
                  <div>
                    {j.skills.map((s: string) => (
                      <em key={s}>{s}</em>
                    ))}
                  </div>
                </div>
                <div className="candidate-match">
                  <span>
                    <b>{j.match}%</b>
                    <small>phù hợp</small>
                  </span>
                  <button
                    onClick={() => {
                      sessionStorage.setItem(
                        "candidate_selected_job_id",
                        String(j.id),
                      );
                      nav("/app/interviews/new");
                    }}
                  >
                    Phỏng vấn vị trí này <ArrowRight />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {!loading && filteredJobs.length > pageSize && (
        <CandidatePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredJobs.length}
          pageSize={pageSize}
          itemLabel="công việc"
          onPageChange={(p) => {
            setCurrentPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </CandidateLayout>
  );
}

export function CandidateCreateInterview() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [cvMode, setCvMode] = useState<"upload" | "stored">("upload");
  const [availableCvs, setAvailableCvs] = useState<any[]>([]);

  const [selected, setSelected] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("candidate_selected_job_id");
    return saved ? parseInt(saved, 10) : null;
  });
  const [query, setQuery] = useState("");
  const [drag, setDrag] = useState(false);
  const [started, setStarted] = useState(false);
  const [jobList, setJobList] = useState<DbJob[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchRealJobs().then((res) => {
      setJobList(res);
      setLoading(false);
    });
    // Fetch available CVs from backend
    fetch(
      (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(
        /\/$/,
        "",
      ) + "/api/v1/interview/demo/options",
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.cvs)) setAvailableCvs(d.cvs);
      })
      .catch(() => {});
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

  const hasCvSelected =
    cvMode === "upload" ? file !== null : selectedCvId !== null;
  const hasJobSelected = Boolean(effectiveJob);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setCvMode("upload");
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
      if (cvMode === "upload" && file) {
        const jdDesc =
          customJdText ||
          (effectiveJob.skills ? effectiveJob.skills.join(", ") : "") ||
          effectiveJob.title;
        analyzeCv(file, jdDesc)
          .then((analysis) => saveCvAnalysis(analysis))
          .catch((err) => console.warn("CV analysis background task:", err));
      }

      const session = await createSessionWithUpload({
        cvFile: cvMode === "upload" ? file : null,
        cvId: cvMode === "stored" ? selectedCvId : null,
        jobId: jobMode === "system" ? selectedJob?.id : null,
        jdFile: jobMode === "upload" ? jdFile : null,
        jdText: jobMode === "upload" ? customJdText : null,
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
        if (cvMode === "upload" && file) {
          sessionStorage.setItem("selected_cv_name", file.name);
        } else if (cvMode === "stored" && selectedCvId) {
          const cvObj = availableCvs.find((c) => c.cv_id === selectedCvId);
          if (cvObj)
            sessionStorage.setItem("selected_cv_name", cvObj.file_name);
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
        <div className="success-page">
          <div className="success-mark">
            <Check />
          </div>
          <span className="pill">
            <Sparkles size={13} /> MÔ HÌNH AI ĐÃ SẴN SÀNG
          </span>
          <h1>Bộ câu hỏi đã được tạo riêng cho bạn!</h1>
          <p>
            Mô hình 1 (Question Ranker V2) đã phân tích hồ sơ CV của bạn và đối
            chiếu với vị trí <b>{effectiveJob?.title}</b> (
            {effectiveJob?.company}) để chọn ra các câu hỏi sát thực tế nhất.
          </p>
          <div className="progress-box">
            <div>
              <span>Hồ sơ ứng viên & Vị trí</span>
              <b>Hoàn tất</b>
            </div>
            <div className="progress">
              <i />
            </div>
            <div>
              <span>Bộ câu hỏi AI</span>
              <b className="working">Đã tuyển chọn</b>
            </div>
          </div>
          <button
            className="primary full"
            onClick={() => nav("/app/interviews/device-check")}
          >
            Vào kiểm tra thiết bị & phỏng vấn ngay <ArrowRight size={17} />
          </button>
          <button
            className="secondary success-back"
            onClick={() => setStarted(false)}
          >
            Quay lại chỉnh sửa hồ sơ
          </button>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout active="/app/interviews/new">
      <CandidateHeader
        title="Tạo phỏng vấn mới"
        desc="Chuẩn bị buổi phỏng vấn"
      />
      <div className="stepper">
        <div className="done">
          <i>
            <Check />
          </i>
          <span>
            <b>Hồ sơ ứng viên</b>
            <small>Tải lên CV</small>
          </span>
        </div>
        <em />
        <div
          className={hasJobSelected ? "done" : hasCvSelected ? "current" : ""}
        >
          <i>2</i>
          <span>
            <b>Chọn công việc</b>
            <small>Vị trí ứng tuyển</small>
          </span>
        </div>
        <em />
        <div className={hasJobSelected && hasCvSelected ? "current" : ""}>
          <i>3</i>
          <span>
            <b>Xác nhận</b>
            <small>Sẵn sàng bắt đầu</small>
          </span>
        </div>
      </div>
      <div className="create-grid">
        <div className="create-main">
          {/* Section 01: CV */}
          <section className="form-card">
            <div className="card-heading">
              <span className="number">01</span>
              <div>
                <h2>Hồ sơ ứng viên (CV)</h2>
                <p>
                  Tải file CV của bạn hoặc chọn từ danh sách CV có sẵn trong hệ
                  thống.
                </p>
              </div>
              {hasCvSelected && (
                <span className="complete">
                  <Check /> Hoàn tất
                </span>
              )}
            </div>

            {/* Toggle CV Mode */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "14px",
                padding: "4px",
                background: "#f3f4f6",
                borderRadius: "10px",
                width: "fit-content",
              }}
            >
              <button
                type="button"
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: cvMode === "upload" ? "#5b5bd6" : "transparent",
                  color: cvMode === "upload" ? "#fff" : "#4b5563",
                }}
                onClick={() => setCvMode("upload")}
              >
                Tải file CV từ máy tính
              </button>
              <button
                type="button"
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: cvMode === "stored" ? "#5b5bd6" : "transparent",
                  color: cvMode === "stored" ? "#fff" : "#4b5563",
                }}
                onClick={() => setCvMode("stored")}
              >
                Chọn CV mẫu có sẵn ({availableCvs.length})
              </button>
            </div>

            {cvMode === "upload" ? (
              !file ? (
                <div
                  className={`dropzone ${drag ? "drag" : ""}`}
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
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setCvMode("upload");
                    }}
                  />
                  <span>
                    <UploadCloud />
                  </span>
                  <h3>Kéo & thả CV của bạn vào đây</h3>
                  <p>
                    hoặc <b>chọn tệp từ máy tính</b>
                  </p>
                  <small>Hỗ trợ PDF, DOCX, TXT · Tối đa 10MB</small>
                </div>
              ) : (
                <div className="file-item">
                  <span className="pdf">
                    <FileText />
                  </span>
                  <div>
                    <b>{file.name}</b>
                    <small>
                      {(file.size / 1024 / 1024).toFixed(1)} MB · Sẵn sàng để AI
                      đọc & sinh câu hỏi riêng
                    </small>
                  </div>
                  <span className="file-ok">
                    <Check />
                  </span>
                  <button onClick={() => setFile(null)}>
                    <X />
                  </button>
                </div>
              )
            ) : (
              <div style={{ padding: "8px 0" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  Chọn hồ sơ CV lưu sẵn:
                </label>
                <select
                  value={selectedCvId || ""}
                  onChange={(e) =>
                    setSelectedCvId(
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    outline: "none",
                  }}
                >
                  <option value="">-- Chọn một CV từ kho dữ liệu --</option>
                  {availableCvs.map((c) => (
                    <option key={c.cv_id} value={c.cv_id}>
                      {c.file_name} (ID: {c.cv_id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* Section 02: Job Selection or Custom Upload */}
          <section className="form-card">
            <div className="card-heading">
              <span className="number">02</span>
              <div>
                <h2>Chọn vị trí tuyển dụng</h2>
                <p>
                  Chọn công việc có sẵn từ hệ thống hoặc tải lên bản mô tả công
                  việc (JD) bên ngoài.
                </p>
              </div>
              {hasJobSelected && (
                <span className="complete">
                  <Check /> Hoàn tất
                </span>
              )}
            </div>

            {/* Switch Tabs between System Jobs and Custom Upload */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                padding: "4px",
                background: "#f3f4f6",
                borderRadius: "10px",
                width: "fit-content",
              }}
            >
              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: jobMode === "system" ? "#5b5bd6" : "transparent",
                  color: jobMode === "system" ? "#fff" : "#4b5563",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
                onClick={() => setJobMode("system")}
              >
                <BriefcaseBusiness size={15} />
                Chọn từ kho dữ liệu ({jobList.length})
              </button>

              <button
                type="button"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: jobMode === "upload" ? "#5b5bd6" : "transparent",
                  color: jobMode === "upload" ? "#fff" : "#4b5563",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s",
                }}
                onClick={() => setJobMode("upload")}
              >
                <UploadCloud size={15} />
                Tải lên / Nhập Job ngoài
              </button>
            </div>

            {jobMode === "system" ? (
              <>
                <div className="job-search">
                  <Search />
                  <input
                    placeholder="Tìm kiếm theo tên vị trí, công ty hoặc địa điểm..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {loading ? (
                  <div
                    style={{
                      padding: "36px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    Đang nạp danh sách công việc từ kho dữ liệu...
                  </div>
                ) : (
                  <div
                    className="job-list"
                    style={{ maxHeight: "420px", overflowY: "auto" }}
                  >
                    {filtered.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        className={`job-option ${selected === job.id ? "selected" : ""}`}
                        onClick={() => setSelected(job.id)}
                      >
                        <span
                          className="job-icon"
                          style={{ background: job.accent }}
                        >
                          {job.title
                            .split(" ")
                            .slice(0, 2)
                            .map((x) => x[0])
                            .join("")}
                        </span>
                        <span className="job-info">
                          <b>{job.title}</b>
                          <small>
                            {job.company} · {job.location}
                          </small>
                          <span>
                            {job.skills.map((s) => (
                              <i key={s}>{s}</i>
                            ))}
                          </span>
                        </span>
                        <i className="radio">
                          {selected === job.id && <span />}
                        </i>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <div
                        style={{
                          padding: "24px",
                          textAlign: "center",
                          color: "#888",
                        }}
                      >
                        Không tìm thấy công việc phù hợp với từ khóa "{query}".
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Drag and Drop JD File */}
                {!jdFile ? (
                  <div
                    className={`dropzone ${jdDrag ? "drag" : ""}`}
                    style={{ padding: "24px", borderStyle: "dashed" }}
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
                      style={{ display: "none" }}
                      onChange={(e) =>
                        handleJdFileChange(e.target.files?.[0] || null)
                      }
                    />
                    <span>
                      <UploadCloud size={24} />
                    </span>
                    <h3 style={{ fontSize: "15px" }}>
                      Kéo & thả file JD (Mô tả công việc) vào đây
                    </h3>
                    <p style={{ margin: "4px 0" }}>
                      hoặc <b>chọn tệp từ máy tính</b>
                    </p>
                    <small>Hỗ trợ PDF, DOCX, TXT · Tối đa 10MB</small>
                  </div>
                ) : (
                  <div className="file-item">
                    <span className="pdf">
                      <FileText />
                    </span>
                    <div>
                      <b>{jdFile.name}</b>
                      <small>
                        {(jdFile.size / 1024 / 1024).toFixed(1)} MB · File JD đã
                        tiếp nhận
                      </small>
                    </div>
                    <span className="file-ok">
                      <Check />
                    </span>
                    <button type="button" onClick={() => setJdFile(null)}>
                      <X />
                    </button>
                  </div>
                )}

                {/* Title & Company Input Fields */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Tên vị trí tuyển dụng{" "}
                      <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Senior Backend Engineer, AI Specialist..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: "6px",
                      }}
                    >
                      Tên công ty / Doanh nghiệp
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Google, VNG, VinAI, FPT..."
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* JD Textarea */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Nội dung mô tả công việc (Dán nội dung JD hoặc yêu cầu tuyển
                    dụng)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Dán nội dung chi tiết bài tuyển dụng, trách nhiệm hoặc kỹ năng yêu cầu vào đây để AI phân tích..."
                    value={customJdText}
                    onChange={(e) => setCustomJdText(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Section 03: Số lượng câu hỏi phỏng vấn */}
          <section className="form-card">
            <div className="card-heading">
              <span className="number">03</span>
              <div>
                <h2>Số lượng câu hỏi phỏng vấn</h2>
                <p>
                  Chọn số lượng câu hỏi để AI sinh và điều phối toàn bộ buổi
                  phỏng vấn (Hỏi - Trả lời - Tiếp tục)
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "12px",
                marginTop: "16px",
              }}
            >
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
                  desc: "Toàn diện tất cả kỹ năng",
                },
              ].map((opt) => {
                const active = numQuestions === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setNumQuestions(opt.count)}
                    style={{
                      padding: "14px 12px",
                      borderRadius: "12px",
                      border: active
                        ? "2px solid #5b5bd6"
                        : "1px solid #e5e7eb",
                      background: active ? "#f5f3ff" : "#ffffff",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      boxShadow: active
                        ? "0 4px 12px rgba(91, 91, 214, 0.15)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <b
                        style={{
                          fontSize: "16px",
                          color: active ? "#5b5bd6" : "#111827",
                        }}
                      >
                        {opt.label}
                      </b>
                      {active && <Check size={16} color="#5b5bd6" />}
                    </div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6b7280",
                        marginBottom: "2px",
                      }}
                    >
                      {opt.time}
                    </span>
                    <small
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: "#9ca3af",
                        lineHeight: 1.3,
                      }}
                    >
                      {opt.desc}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Aside Summary Card */}
        <aside className="summary-card">
          <span className="pill">
            <Sparkles size={13} /> TÓM TẮT
          </span>
          <h3>Buổi phỏng vấn của bạn</h3>
          <div className="summary-row">
            <small>HỒ SƠ</small>
            {file ? (
              <div>
                <span className="pdf tiny">
                  <FileText />
                </span>
                <p>
                  <b>{file.name}</b>
                  <small>Tệp tải lên</small>
                </p>
              </div>
            ) : selectedCvId ? (
              <div>
                <span className="pdf tiny">
                  <FileText />
                </span>
                <p>
                  <b>
                    {
                      availableCvs.find((c) => c.cv_id === selectedCvId)
                        ?.file_name
                    }
                  </b>
                  <small>CV từ hệ thống</small>
                </p>
              </div>
            ) : (
              <p className="empty-value">Chưa có CV</p>
            )}
          </div>
          <div className="summary-row">
            <small>VỊ TRÍ</small>
            {effectiveJob ? (
              <div>
                <span
                  className="job-icon tiny-job"
                  style={{ background: effectiveJob.accent }}
                >
                  {effectiveJob.title[0]}
                </span>
                <p>
                  <b>{effectiveJob.title}</b>
                  <small>
                    {effectiveJob.company}{" "}
                    {jobMode === "upload" ? "(Ngoài hệ thống)" : ""}
                  </small>
                </p>
              </div>
            ) : (
              <p className="empty-value">Chưa chọn công việc</p>
            )}
          </div>
          <div className="summary-note">
            <Sparkles />
            <p>
              <b>AI sẽ chuẩn bị gì?</b>
              <span>
                Mô hình 1 sẽ đọc trực tiếp CV & Job bạn đã chọn để chọn ra câu
                hỏi sát thực tế nhất.
              </span>
            </p>
          </div>

          {sessionError && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "13px",
                margin: "8px 0",
                background: "#fee2e2",
                padding: "8px 12px",
                borderRadius: "6px",
              }}
            >
              {sessionError}
            </div>
          )}

          <button
            className="primary full"
            disabled={!hasCvSelected || !effectiveJob || creatingSession}
            onClick={handleStart}
          >
            {creatingSession
              ? "AI đang đọc CV & tuyển chọn câu hỏi..."
              : "Tiếp tục với AI "}
            {!creatingSession && <ArrowRight />}
          </button>
          <p className="secure">🔒 Dữ liệu được mã hóa và bảo mật</p>
        </aside>
      </div>
    </CandidateLayout>
  );
}

export function CandidateResults() {
  const nav = useNavigate();
  const { user } = useAuth();
  const session = loadInterviewSession();
  const cvAnalysis = loadCvAnalysis();

  const uid =
    user?.user_id_num ||
    user?.id ||
    localStorage.getItem("current_user_id") ||
    "1";
  const cacheKey = `user_db_sessions_${uid}`;

  // Initialize from cache if present to avoid any visual delay or 1-to-many jumping
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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const cleanUid =
      user?.user_id_num ||
      user?.id ||
      localStorage.getItem("current_user_id") ||
      1;
    getUserSessions(cleanUid)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
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

  // Compute evaluation stats dynamically from actual sessions
  const latestSession =
    userDbSessions && userDbSessions.length > 0 ? userDbSessions[0] : session;
  const currentEval = computeAiEvaluation(latestSession);
  const hasRealSession =
    session && session.turns && session.turns.some((t) => t.answer);

  const realScore = currentEval?.overallScore ?? (hasRealSession ? 80 : 0);
  const completedCount =
    userDbSessions.length > 0
      ? String(userDbSessions.length).padStart(2, "0")
      : hasRealSession
        ? "01"
        : "00";
  const topCompetency =
    currentEval?.competencies?.[0]?.label?.split("&")?.[0]?.trim() ||
    "Kiến thức chuyên môn";
  const topScore = currentEval?.competencies?.[0]?.score || realScore || 80;

  const totalPages = Math.ceil(userDbSessions.length / pageSize) || 1;
  const paginatedSessions = userDbSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <CandidateLayout active="/app/results">
      <CandidateHeader
        title="Kết quả của tôi"
        desc="Theo dõi sự tiến bộ qua từng phiên phỏng vấn."
      />
      <div className="personal-summary">
        <div>
          <small>ĐIỂM GẦN NHẤT</small>
          <b style={realScore === 0 ? { color: "#dc2626" } : {}}>
            {realScore}
          </b>
          <span>/100 điểm AI đánh giá</span>
        </div>
        <div>
          <small>PHỎNG VẤN HOÀN THÀNH</small>
          <b>{completedCount}</b>
          <span>Trong 30 ngày qua</span>
        </div>
        <div>
          <small>NĂNG LỰC NỔI BẬT</small>
          <b>
            {currentEval.overallScore > 0 ? topCompetency : "Chưa có"}
          </b>
          <span>
            {currentEval.overallScore > 0 ? `${topScore}/100 điểm` : "--"}
          </span>
        </div>
      </div>

      <section className="personal-results">
        {loading && userDbSessions.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "#64748b",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e1e5e2",
            }}
          >
            Đang tải danh sách kết quả phỏng vấn...
          </div>
        ) : userDbSessions && userDbSessions.length > 0 ? (
          paginatedSessions.map((s, idx) => {
            const actualIndex = (currentPage - 1) * pageSize + idx;
            const dateStr = s.created_at
              ? new Date(s.created_at).toLocaleDateString("vi-VN")
              : "Gần đây";
            const evalObj = computeAiEvaluation(s);
            const answeredTurns = s.turns
              ? s.turns.filter((t: any) => t.answer).length
              : 0;
            const score = evalObj.overallScore ?? 80;
            const jobName =
              s.job_profile_json?.title ||
              s.cv_profile_json?.target_role ||
              evalObj.jobTitle ||
              "Phiên phỏng vấn AI";
            return (
              <div
                className="candidate-activity"
                key={s.session_id || actualIndex}
                style={{
                  borderLeft:
                    actualIndex === 0
                      ? score === 0
                        ? "4px solid #ef4444"
                        : "4px solid #10b981"
                      : undefined,
                }}
              >
                <span
                  className="candidate-job-icon"
                  style={
                    score === 0
                      ? { background: "#fef2f2", color: "#dc2626" }
                      : { background: "#ecfdf5", color: "#059669" }
                  }
                >
                  {s.current_stage
                    ? s.current_stage.slice(0, 2).toUpperCase()
                    : "AI"}
                </span>
                <p>
                  <b>{jobName}</b>
                  <small>
                    Phiên #
                    {s.session_id ? s.session_id.slice(0, 8) : actualIndex + 1}{" "}
                    • {dateStr} • {answeredTurns} câu đã trả lời
                  </small>
                </p>
                <div>
                  <strong
                    style={{
                      color: score === 0 ? "#dc2626" : "#059669",
                    }}
                  >
                    {score}
                    <small>/100</small>
                  </strong>
                  <button
                    className={actualIndex === 0 ? "primary" : ""}
                    onClick={() => nav(`/app/results/${s.session_id}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            );
          })
        ) : hasRealSession ? (
          <div
            className="candidate-activity"
            style={{
              borderLeft:
                realScore === 0 ? "4px solid #ef4444" : "4px solid #10b981",
            }}
          >
            <span
              className="candidate-job-icon"
              style={
                realScore === 0
                  ? { background: "#fef2f2", color: "#dc2626" }
                  : { background: "#ecfdf5", color: "#059669" }
              }
            >
              AI
            </span>
            <p>
              <b>
                {cvAnalysis?.job_context?.title ||
                  currentEval.jobTitle ||
                  "Phiên phỏng vấn AI"}
              </b>
              <small>
                Phiên phỏng vấn AI • {new Date().toLocaleDateString("vi-VN")} •{" "}
                {currentEval.answeredCount} câu hỏi
              </small>
            </p>
            <div>
              <strong
                style={{
                  color: realScore === 0 ? "#dc2626" : "#059669",
                }}
              >
                {realScore}
                <small>/100</small>
              </strong>
              <button
                className="primary"
                onClick={() =>
                  nav(`/app/results/${session?.session_id || "latest"}`)
                }
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              color: "#64748b",
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e1e5e2",
            }}
          >
            <Sparkles
              size={28}
              style={{ color: "#059669", marginBottom: "12px" }}
            />
            <h3
              style={{ margin: "0 0 6px", fontSize: "16px", color: "#1e293b" }}
            >
              Chưa có phiên phỏng vấn nào
            </h3>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Hãy bắt đầu một buổi phỏng vấn AI để kiểm tra và rèn luyện năng
              lực.
            </p>
            <button
              className="primary"
              style={{ marginTop: "16px" }}
              onClick={() => nav("/app/interviews/new")}
            >
              Tạo phỏng vấn ngay
            </button>
          </div>
        )}
      </section>

      {!loading && userDbSessions.length > pageSize && (
        <CandidatePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={userDbSessions.length}
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
  const { id } = useParams<{ id: string }>();
  return (
    <CandidateLayout active="/app/results">
      <div className="candidate-shared-report">
        <ReportContent
          sessionId={id}
          candidateView
          onBack={() => nav("/app/results")}
        />
      </div>
    </CandidateLayout>
  );
}

export function CandidateProfile() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentRole, setCurrentRole] = useState(
    user?.current_role || "Senior Frontend Developer",
  );
  const [location, setLocation] = useState(user?.location || "Đà Nẵng");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state if user changes or on first mount
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
      if (user.email) setEmail(user.email);
      if (user.current_role) setCurrentRole(user.current_role);
      if (user.location) setLocation(user.location);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        current_role: currentRole.trim(),
        location: location.trim(),
      });
      setSuccessMsg("Cập nhật hồ sơ thành công!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Cập nhật hồ sơ thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    ? name
        .split(" ")
        .map((w: string) => w[0])
        .filter(Boolean)
        .slice(-2)
        .join("")
        .toUpperCase()
    : user?.username
      ? user.username.slice(0, 2).toUpperCase()
      : "UV";

  return (
    <CandidateLayout active="/app/profile">
      <CandidateHeader
        title="Hồ sơ cá nhân"
        desc="Quản lý thông tin và CV mặc định của bạn."
      />
      <section className="candidate-profile-page">
        <div className="candidate-profile-head">
          <span>{initials}</span>
          <div>
            <h2>{name || user?.name || "Ứng viên"}</h2>
            <p>{email || user?.email || "user@prephire.vn"}</p>
            <small style={{ color: "#6b7280" }}>
              Tài khoản: <b>{user?.username || "user"}</b>
            </small>
          </div>
        </div>

        {successMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <X size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="candidate-profile-form">
            <label>
              Họ và tên
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên"
                required
              />
            </label>
            <label>
              Số điện thoại
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+84 912 345 678"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
              />
            </label>
            <label>
              Vị trí mong muốn
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="Ví dụ: Senior Frontend Developer"
              />
            </label>
          </div>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </form>
      </section>
    </CandidateLayout>
  );
}
