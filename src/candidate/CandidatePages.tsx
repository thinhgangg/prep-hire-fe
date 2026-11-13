import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ReportContent, computeAiEvaluation } from "../Pages";
import { loadInterviewSession, loadCvAnalysis, getUserSessions } from "../services/interviewApi";
import {
  analyzeCv,
  createSessionWithUpload,
  saveCvAnalysis,
  saveInterviewSession,
} from "../services/interviewApi";
import { fetchRealJobs, DbJob } from "../services/jobApi";

const candidateJobs = [
  {
    id: 1,
    title: "Senior Frontend Developer",
    company: "Northstar Labs",
    location: "Hà Nội · Hybrid",
    type: "Toàn thời gian",
    match: 92,
    skills: ["React", "TypeScript", "Next.js"],
    description:
      "Tuyển Senior Frontend Developer có kinh nghiệm ReactJS, TypeScript, Next.js, kiểm thử giao diện và system design. Ứng viên cần tối ưu hiệu năng, xây dựng component tái sử dụng và phối hợp với backend qua REST API hoặc GraphQL.",
  },
  {
    id: 2,
    title: "Backend Developer",
    company: "Vertex Technology",
    location: "TP. Hồ Chí Minh",
    type: "Toàn thời gian",
    match: 84,
    skills: ["Node.js", "PostgreSQL", "AWS"],
    description:
      "Tuyển Backend Developer có kinh nghiệm Node.js, PostgreSQL, REST API, xác thực và triển khai dịch vụ trên AWS. Ứng viên cần hiểu database transaction, caching, bảo mật API, Docker và kiến trúc có khả năng mở rộng.",
  },
  {
    id: 3,
    title: "Full-stack Engineer",
    company: "Acme Digital",
    location: "Remote",
    type: "Toàn thời gian",
    match: 79,
    skills: ["React", "Python", "Docker"],
    description:
      "Tuyển Full-stack Engineer có kinh nghiệm ReactJS, Python, thiết kế API và Docker. Ứng viên cần phát triển được cả frontend và backend, làm việc với cơ sở dữ liệu và triển khai ứng dụng trong môi trường cloud.",
  },
];

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
            ? user.name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
            : (user?.username ? user.username.slice(0, 2).toUpperCase() : 'UV');
          return (
            <div className="candidate-user">
              <span>{initials}</span>
              <p>
                <b>{user?.name || 'Ứng viên'}</b>
                <small>{user?.username ? `ID: ${user.username}` : 'Ứng viên'}</small>
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
  return (
    <CandidateLayout active="/app">
      <CandidateHeader
        title={`Xin chào, ${user?.name || "Ứng viên"} 👋`}
        desc="Sẵn sàng cho bước tiếp theo trong hành trình nghề nghiệp của bạn?"
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
          <span>AI INTERVIEW</span>
          <h2>
            Thể hiện năng lực.
            <br />
            <em>Chinh phục cơ hội.</em>
          </h2>
          <p>
            Thực hiện phỏng vấn thử với AI và nhận đánh giá chi tiết để hiểu rõ
            điểm mạnh của bạn.
          </p>
          <button onClick={() => nav("/app/interviews/new")}>
            Tạo phiên phỏng vấn <ArrowRight />
          </button>
        </div>
        <div className="candidate-score">
          <span>
            <b>86</b>
            <small>ĐIỂM GẦN NHẤT</small>
          </span>
          <p>
            <Check /> Top 12% ứng viên
          </p>
        </div>
      </section>
      <div className="candidate-quick">
        <article>
          <span>
            <BriefcaseBusiness />
          </span>
          <p>
            <small>CÔNG VIỆC PHÙ HỢP</small>
            <b>06</b>
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
            <small>PHỎNG VẤN ĐÃ HOÀN THÀNH</small>
            <b>03</b>
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
            <b>86</b>
          </p>
          <em>+8 điểm</em>
        </article>
      </div>
      <section className="candidate-section">
        <div>
          <h2>Hoạt động gần đây</h2>
          <p>Kết quả các phiên phỏng vấn của bạn</p>
        </div>
        <div className="candidate-activity">
          <span className="candidate-job-icon">FE</span>
          <p>
            <b>Senior Frontend Developer</b>
            <small>28/09/2026 · Hoàn thành</small>
          </p>
          <div>
            <strong>
              86<small>/100</small>
            </strong>
            <button onClick={() => nav("/app/results/1042")}>
              Xem kết quả
            </button>
          </div>
        </div>
      </section>
    </CandidateLayout>
  );
}

export function CandidateJobs() {
  const nav = useNavigate(),
    [query, setQuery] = useState("");
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm vị trí hoặc kỹ năng..."
        />
      </div>
      <div className="candidate-job-list">
        {candidateJobs
          .filter((j) => j.title.toLowerCase().includes(query.toLowerCase()))
          .map((j) => (
            <article key={j.id}>
              <div className="candidate-company">
                {j.company
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </div>
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
                  {j.skills.map((s) => (
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
          ))}
      </div>
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
      .catch(() => { });
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
            onClick={() => nav("/app/interviews/demo/device-check")}
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
      <header className="simple-header">
        <div>
          <button className="back" onClick={() => nav("/app")}>
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
    </CandidateLayout>
  );
}

export function CandidateResults() {
  const nav = useNavigate();
  const { user } = useAuth();
  const session = loadInterviewSession();
  const [userDbSessions, setUserDbSessions] = useState<any[]>([]);

  useEffect(() => {
    if (user?.user_id_num || user?.id) {
      const uid = user.user_id_num || user.id;
      getUserSessions(uid).then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setUserDbSessions(res);
        }
      });
    }
  }, [user]);
  const cvAnalysis = loadCvAnalysis();

  // Compute real AI evaluation for current session if available
  const currentEval = computeAiEvaluation(session);
  const hasRealSession = session && session.turns && session.turns.some(t => t.answer);

  // Dynamic candidate & job info
  const realJobTitle = cvAnalysis?.job_context?.title || currentEval.jobTitle || 'Senior Fullstack Engineer';
  const realScore = session ? currentEval.overallScore : 83;

  return (
    <CandidateLayout active="/app/results">
      <CandidateHeader
        title="Kết quả của tôi"
        desc="Theo dõi sự tiến bộ qua từng phiên phỏng vấn."
      />
      <div className="personal-summary">
        <div>
          <small>ĐIỂM GẦN NHẤT</small>
          <b style={session && currentEval.overallScore === 0 ? { color: '#dc2626' } : {}}>{realScore}</b>
          <span>/100 điểm AI đánh giá</span>
        </div>
        <div>
          <small>PHỎNG VẤN HOÀN THÀNH</small>
          <b>{hasRealSession ? '04' : '03'}</b>
          <span>Trong 30 ngày qua</span>
        </div>
        <div>
          <small>NĂNG LỰC NỔI BẬT</small>
          <b>{currentEval.overallScore > 0 ? (currentEval.competencies[0]?.label.split('&')[0].trim() || 'Chuyên môn') : 'Chưa có'}</b>
          <span>{session ? currentEval.competencies[0]?.score : 83}/100 điểm</span>
        </div>
      </div>

      <section className="personal-results">
        {/* Latest completed interview session with real AI evaluated score */}
        <div className="candidate-activity" style={{ borderLeft: session && currentEval.overallScore === 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
          <span className="candidate-job-icon" style={session && currentEval.overallScore === 0 ? { background: '#fef2f2', color: '#dc2626' } : { background: '#ecfdf5', color: '#059669' }}>AI</span>
          <p>
            <b>{realJobTitle}</b>
            <small>Phiên phỏng vấn AI • {new Date().toLocaleDateString('vi-VN')} • {currentEval.answeredCount} câu hỏi</small>
          </p>
          <div>
            <strong style={{ color: session && currentEval.overallScore === 0 ? '#dc2626' : '#059669' }}>
              {realScore}<small>/100</small>
            </strong>
            <button className="primary" onClick={() => nav("/app/results/latest")}>
              Xem chi tiết
            </button>
          </div>
        </div>

        {/* Historical sessions with synchronized AI scores */}
        <div className="candidate-activity">
          <span className="candidate-job-icon">FE</span>
          <p>
            <b>Senior Frontend Developer</b>
            <small>Northstar Labs • 28/09/2026</small>
          </p>
          <div>
            <strong>
              86<small>/100</small>
            </strong>
            <button onClick={() => nav("/app/results/1042")}>
              Xem chi tiết
            </button>
          </div>
        </div>

        <div className="candidate-activity">
          <span className="candidate-job-icon backend">BE</span>
          <p>
            <b>Backend Developer</b>
            <small>Vertex Technology • 21/09/2026</small>
          </p>
          <div>
            <strong>
              {realScore}<small>/100</small>
            </strong>
            <button onClick={() => nav("/app/results/1041")}>
              Xem chi tiết
            </button>
          </div>
        </div>
      </section>
    </CandidateLayout>
  );
}

export function CandidateResultDetail() {
  const nav = useNavigate();
  return (
    <CandidateLayout active="/app/results">
      <div className="candidate-shared-report">
        <ReportContent candidateView onBack={() => nav("/app/results")} />
      </div>
    </CandidateLayout>
  );
}

export function CandidateProfile() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentRole, setCurrentRole] = useState(user?.current_role || "Senior Frontend Developer");
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
    ? name.split(" ").map((w: string) => w[0]).filter(Boolean).slice(-2).join("").toUpperCase()
    : (user?.username ? user.username.slice(0, 2).toUpperCase() : "UV");

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
          <div style={{
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
          }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
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
          }}>
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
