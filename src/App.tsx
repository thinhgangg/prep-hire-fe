import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { fetchRealJobs, DbJob } from "./services/jobApi";
import {
  createSessionWithUpload,
  saveInterviewSession,
} from "./services/interviewApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import {
  AnalysisPage,
  CandidatesPage,
  DeviceCheckPage,
  InterviewRoom,
  InterviewsPage,
  JobsPage,
  ProcessingPage,
  ReportPage,
  ReportsPage,
  SettingsPage,
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
  | "analysis"
  | "device"
  | "room"
  | "processing"
  | "report";
type Job = {
  id: number;
  title: string;
  department: string;
  type: string;
  location: string;
  accent: string;
  skills: string[];
  description: string;
};

const jobs: Job[] = [
  {
    id: 1,
    title: "Senior Frontend Developer",
    department: "Product & Engineering",
    type: "Toàn thời gian",
    location: "Hà Nội · Hybrid",
    accent: "#5b5bd6",
    skills: ["React", "TypeScript", "System Design"],
    description:
      "Tuyển Senior Frontend Developer có kinh nghiệm ReactJS, TypeScript, Next.js, kiểm thử giao diện và system design. Ứng viên cần có khả năng tối ưu hiệu năng, xây dựng component tái sử dụng và phối hợp với backend qua REST API hoặc GraphQL.",
  },
  {
    id: 2,
    title: "Backend Developer",
    department: "Engineering",
    type: "Toàn thời gian",
    location: "TP. Hồ Chí Minh",
    accent: "#12805c",
    skills: ["Node.js", "PostgreSQL", "REST API"],
    description:
      "Tuyển Backend Developer có kinh nghiệm Node.js, PostgreSQL, thiết kế REST API, xác thực và triển khai dịch vụ. Ứng viên cần hiểu database transaction, caching, bảo mật API, Docker và kiến trúc hệ thống có khả năng mở rộng.",
  },
  {
    id: 3,
    title: "Product Designer",
    department: "Product & Design",
    type: "Toàn thời gian",
    location: "Remote",
    accent: "#d97745",
    skills: ["Figma", "UX Research", "Design System"],
    description:
      "Tuyển Product Designer có kinh nghiệm Figma, UX Research và xây dựng Design System. Ứng viên cần trình bày được quy trình nghiên cứu người dùng, thiết kế prototype, kiểm thử usability và hợp tác với product manager cùng lập trình viên.",
  },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`logo ${light ? "light" : ""}`}>
      <span className="logo-mark">
        <Sparkles size={17} />
      </span>
      <span>Interviewly</span>
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
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const isAdmin =
      email.trim().toLowerCase() === "admin" && password === "123456";
    const isCandidate =
      email.trim().toLowerCase() === "user" && password === "123456";
    if (!isAdmin && !isCandidate) {
      setError(
        "Email hoặc mật khẩu không đúng. Vui lòng dùng tài khoản mẫu bên dưới.",
      );
      return;
    }
    setBusy(true);
    setTimeout(
      () => (isCandidate && onCandidate ? onCandidate() : onLogin()),
      500,
    );
  };
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-top">
          <Logo />
        </div>
        <div className="login-box">
          <div className="eyebrow">CHÀO MỪNG TRỞ LẠI</div>
          <h1>
            Đăng nhập vào
            <br />
            không gian tuyển dụng.
          </h1>
          <p className="lead">
            Tiếp tục hành trình tìm kiếm những ứng viên phù hợp nhất cùng trợ lý
            AI của bạn.
          </p>
          <button className="google-btn" onClick={onLogin}>
            <span className="google-g">G</span> Tiếp tục với Google
          </button>
          <div className="divider">
            <span>hoặc đăng nhập bằng email</span>
          </div>
          <form onSubmit={submit}>
            <label>Tên đăng nhập</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
            />
            <div className="password-label">
              <label>Mật khẩu</label>
              <a href="#">Quên mật khẩu?</a>
            </div>
            <div className="pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}>
                {showPass ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {error && <div className="login-error">{error}</div>}
            <label className="remember">
              <input type="checkbox" defaultChecked />{" "}
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <button className="primary full" disabled={busy}>
              {busy ? (
                "Đang đăng nhập…"
              ) : (
                <>
                  Đăng nhập <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <div className="demo-accounts">
            <p>TÀI KHOẢN DÙNG THỬ</p>
            <button
              type="button"
              onClick={() => {
                setEmail("admin");
                setPassword("123456");
                setError("");
              }}
            >
              <span className="demo-admin">AD</span>
              <span>
                <b>Quản trị viên</b>
                <small>admin · 123456</small>
              </span>
              <ArrowRight />
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("user");
                setPassword("123456");
                setError("");
              }}
            >
              <span className="demo-candidate">UV</span>
              <span>
                <b>Ứng viên</b>
                <small>user · 123456</small>
              </span>
              <ArrowRight />
            </button>
          </div>
          <p className="signup">
            Chưa có tài khoản? <a href="#">Đăng ký miễn phí</a>
          </p>
        </div>
        <p className="copyright">
          © 2026 Interviewly · <a href="#">Quyền riêng tư</a> ·{" "}
          <a href="#">Điều khoản</a>
        </p>
      </section>
      <aside className="login-aside">
        <div className="orb orb-one"></div>
        <div className="orb orb-two"></div>
        <div className="quote-badge">
          <span></span> AI INTERVIEW PLATFORM
        </div>
        <blockquote>
          “Tuyển đúng người không nên là một trò may rủi.”
        </blockquote>
        <p>
          Interviewly giúp đội ngũ của bạn đánh giá ứng viên nhất quán, khách
          quan và sâu sắc hơn.
        </p>
        <div className="mini-report">
          <div className="mini-head">
            <div className="avatar">NA</div>
            <div>
              <b>Nguyễn Minh Anh</b>
              <small>Frontend Developer</small>
            </div>
            <span className="score">86</span>
          </div>
          <div className="bars">
            <span style={{ width: "86%" }}></span>
            <span style={{ width: "74%" }}></span>
            <span style={{ width: "91%" }}></span>
          </div>
          <div className="mini-foot">
            <span>
              <Check size={13} /> Phân tích hoàn tất
            </span>
            <small>Vừa xong</small>
          </div>
        </div>
        <div className="trusted">
          <span>Được tin dùng bởi đội ngũ tuyển dụng hiện đại</span>
          <div>northstar &nbsp;&nbsp; ACME® &nbsp;&nbsp; VERTEX</div>
        </div>
      </aside>
    </main>
  );
}

function Sidebar({ page, go }: { page: Page; go: (p: Page) => void }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <>
      <button className="mobile-menu" onClick={() => setOpen(true)}>
        <Menu />
      </button>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="side-logo">
          <Logo />
          <button onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          <small>KHÔNG GIAN LÀM VIỆC</small>
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => {
              go("dashboard");
              setOpen(false);
            }}
          >
            <Home /> Tổng quan
          </button>
          <button
            className={
              [
                "start",
                "interviews",
                "analysis",
                "device",
                "room",
                "processing",
              ].includes(page)
                ? "active"
                : ""
            }
            onClick={() => {
              go("interviews");
              setOpen(false);
            }}
          >
            <Sparkles /> Phỏng vấn <span>12</span>
          </button>
          <button
            className={page === "candidates" ? "active" : ""}
            onClick={() => {
              go("candidates");
              setOpen(false);
            }}
          >
            <Users /> Ứng viên
          </button>
          <button
            className={page === "jobs" ? "active" : ""}
            onClick={() => {
              go("jobs");
              setOpen(false);
            }}
          >
            <BriefcaseBusiness /> Công việc
          </button>
          <button
            className={["reports", "report"].includes(page) ? "active" : ""}
            onClick={() => {
              go("reports");
              setOpen(false);
            }}
          >
            <BarChart3 /> Báo cáo
          </button>
          <small>QUẢN LÝ</small>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => {
              go("settings");
              setOpen(false);
            }}
          >
            <Settings /> Cài đặt
          </button>
          <button>
            <CircleHelp /> Trung tâm hỗ trợ
          </button>
        </nav>
        <div className="upgrade">
          <div className="spark">
            <Sparkles size={18} />
          </div>
          <b>Mở khóa sức mạnh AI</b>
          <p>Nâng cấp để phỏng vấn không giới hạn.</p>
          <button>Tìm hiểu thêm</button>
        </div>
        <div className="profile">
          <div className="avatar">
            {user?.name
              ? user.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(-2)
              : "HN"}
          </div>
          <div>
            <b>{user?.name || "Hoàng Nam"}</b>
            <small>Quản trị viên</small>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              border: 0,
              background: "none",
              cursor: "pointer",
              padding: "6px",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}

export function Dashboard({ go }: { go: (p: Page) => void }) {
  return (
    <AppShell page="dashboard" go={go}>
      <header className="topbar">
        <div>
          <p>THỨ BA, 29 THÁNG 9</p>
          <h1>
            Chào buổi sáng, Nam <span>👋</span>
          </h1>
        </div>
        <div className="top-actions">
          <button className="icon-btn">
            <Bell />
          </button>
          <button className="primary" onClick={() => go("start")}>
            <Sparkles size={17} /> Tạo phỏng vấn mới
          </button>
        </div>
      </header>
      <section className="hero-card">
        <div>
          <span className="pill">
            <Sparkles size={13} /> AI INTERVIEW
          </span>
          <h2>
            Tìm đúng người,
            <br />
            <em>nhanh hơn.</em>
          </h2>
          <p>
            Tải CV lên, chọn vị trí tuyển dụng và để AI giúp bạn chuẩn bị một
            buổi phỏng vấn chuyên sâu.
          </p>
          <button onClick={() => go("start")}>
            Bắt đầu phỏng vấn <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-visual">
          <div className="ring r1"></div>
          <div className="ring r2"></div>
          <div className="candidate-card c1">
            <div className="avatar purple">LT</div>
            <span>
              <b>Linh Trần</b>
              <small>Khớp 92%</small>
            </span>
          </div>
          <div className="candidate-card c2">
            <div className="avatar green">KM</div>
            <span>
              <b>Khoa Mai</b>
              <small>Khớp 87%</small>
            </span>
          </div>
          <div className="ai-core">
            <Sparkles />
            <small>AI</small>
          </div>
        </div>
      </section>
      <div className="section-title">
        <div>
          <h3>Tổng quan tuyển dụng</h3>
          <p>Cập nhật hiệu suất trong 30 ngày gần nhất</p>
        </div>
        <button className="filter">
          30 ngày qua <ChevronDown size={15} />
        </button>
      </div>
      <section className="stats">
        <div>
          <span className="stat-icon lilac">
            <Users />
          </span>
          <p>TỔNG ỨNG VIÊN</p>
          <h3>128</h3>
          <small className="up">↗ 12.5%</small>
        </div>
        <div>
          <span className="stat-icon mint">
            <Sparkles />
          </span>
          <p>ĐÃ PHỎNG VẤN</p>
          <h3>42</h3>
          <small className="up">↗ 8.2%</small>
        </div>
        <div>
          <span className="stat-icon amber">
            <BriefcaseBusiness />
          </span>
          <p>VỊ TRÍ ĐANG MỞ</p>
          <h3>08</h3>
          <small>2 sắp đóng</small>
        </div>
        <div>
          <span className="stat-icon blue">
            <BarChart3 />
          </span>
          <p>ĐIỂM AI TRUNG BÌNH</p>
          <h3>78.4</h3>
          <small className="up">↗ 3.1%</small>
        </div>
      </section>
      <section className="recent">
        <div className="section-title">
          <div>
            <h3>Phỏng vấn gần đây</h3>
            <p>Những ứng viên mới nhất được đánh giá</p>
          </div>
          <button className="text-btn">
            Xem tất cả <ArrowRight size={15} />
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ỨNG VIÊN</th>
                <th>VỊ TRÍ</th>
                <th>NGÀY PHỎNG VẤN</th>
                <th>TRẠNG THÁI</th>
                <th>ĐIỂM AI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Nguyễn Minh Anh",
                  "Frontend Developer",
                  "28/09/2026",
                  "Hoàn thành",
                  "86",
                ],
                [
                  "Trần Gia Bảo",
                  "Backend Developer",
                  "27/09/2026",
                  "Hoàn thành",
                  "79",
                ],
                [
                  "Lê Thu Hà",
                  "Product Designer",
                  "27/09/2026",
                  "Đang xử lý",
                  "—",
                ],
              ].map((r, i) => (
                <tr key={i}>
                  <td>
                    <span className={`avatar a${i}`}>
                      {r[0]
                        .split(" ")
                        .slice(-2)
                        .map((x) => x[0])
                        .join("")}
                    </span>
                    <b>{r[0]}</b>
                  </td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>
                    <span className={`status ${i === 2 ? "processing" : ""}`}>
                      <i></i>
                      {r[3]}
                    </span>
                  </td>
                  <td>
                    <b>{r[4]}</b>
                  </td>
                  <td>•••</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

export function StartInterview({ go }: { go: (p: Page) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [cvMode, setCvMode] = useState<"upload" | "stored">("upload");
  const [availableCvs, setAvailableCvs] = useState<any[]>([]);

  const [selected, setSelected] = useState<number | null>(null);
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
      (import.meta.env.VITE_API_BASE_URL || "http://localhost:8002").replace(
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

    // Clear old session storage so fresh questions are always generated
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
      const session = await createSessionWithUpload({
        cvFile: cvMode === "upload" ? file : null,
        cvId: cvMode === "stored" ? selectedCvId : null,
        jobId: jobMode === "system" ? selectedJob?.id : null,
        jdFile: jobMode === "upload" ? jdFile : null,
        jdText: jobMode === "upload" ? customJdText : null,
        maxQuestions: numQuestions,
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
      <AppShell page="start" go={go}>
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
          <button className="primary full" onClick={() => go("room")}>
            Vào phòng phỏng vấn ngay <ArrowRight size={17} />
          </button>
          <button
            className="secondary success-back"
            onClick={() => setStarted(false)}
          >
            Quay lại chỉnh sửa hồ sơ
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell page="start" go={go}>
      <header className="simple-header">
        <div>
          <button className="back" onClick={() => go("dashboard")}>
            ←
          </button>
          <div>
            <p>TẠO PHỎNG VẤN MỚI</p>
            <h1>Chuẩn bị buổi phỏng vấn</h1>
          </div>
        </div>
        <button className="icon-btn">
          <Bell />
        </button>
      </header>
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
    <div className="app">
      <Sidebar page={page} go={go} />
      <main className="content">{children}</main>
    </div>
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
        ? "Đăng nhập — Interviewly"
        : page === "dashboard"
          ? "Tổng quan — Interviewly"
          : "Tạo phỏng vấn — Interviewly";
  }, [page]);
  if (page === "login") return <Login onLogin={() => go("dashboard")} />;
  if (page === "start") return <StartInterview go={go} />;
  if (page === "interviews") return <InterviewsPage go={go} />;
  if (page === "candidates") return <CandidatesPage go={go} />;
  if (page === "jobs") return <JobsPage go={go} />;
  if (page === "reports") return <ReportsPage go={go} />;
  if (page === "settings") return <SettingsPage go={go} />;
  if (page === "analysis") return <AnalysisPage go={go} />;
  if (page === "device") return <DeviceCheckPage go={go} />;
  if (page === "room") return <InterviewRoom go={go} />;
  if (page === "processing") return <ProcessingPage go={go} />;
  if (page === "report") return <ReportPage go={go} />;
  return <Dashboard go={go} />;
}
