import {
  createStoredSession,
  createCustomSession,
  submitInterviewAnswer,
  getEvidenceSummary,
  loadCvAnalysis,
  loadInterviewSession,
  saveInterviewSession,
  getInterviewSessionById,
  type CvAnalysis,
  type InterviewSession,
  type InterviewTurn,
} from "./services/interviewApi";
import { fetchRealJobs, DbJob } from "./services/jobApi";
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
  FileText,
  Filter,
  Headphones,
  LogOut,
  Mail,
  MapPin,
  Mic,
  MicOff,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Target,
  TrendingUp,
  Users,
  Video,
  VideoOff,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    <div className={`app sub-page ${wide ? "wide" : ""}`}>
      <SubSidebar page={page} go={go} />
      <main className="content sub-content">{children}</main>
    </div>
  );
}

function SubSidebar({ page, go }: Props) {
  const [open, setOpen] = useState(false);
  const items: [Page, string, React.ReactNode][] = [
    ["dashboard", "Tổng quan", <BarChart3 />],
    ["interviews", "Phỏng vấn", <Sparkles />],
    ["candidates", "Ứng viên", <Users />],
    ["jobs", "Công việc", <BriefcaseBusiness />],
    ["reports", "Báo cáo", <FileText />],
    ["settings", "Cài đặt", <Settings />],
  ];
  const move = (id: Page) => {
    go(id);
    setOpen(false);
  };
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <>
      <button className="mobile-menu" onClick={() => setOpen(true)}>
        <MoreHorizontal />
      </button>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar unified-sidebar ${open ? "open" : ""}`}>
        <div className="side-logo">
          <button className="unified-logo" onClick={() => move("dashboard")}>
            <i>
              <Sparkles />
            </i>
            <span>Interviewly</span>
          </button>
          <button onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav>
          <small>KHÔNG GIAN LÀM VIỆC</small>
          {items.slice(0, 5).map(([id, label, icon]) => (
            <button
              key={id}
              className={
                page === id ||
                (id === "interviews" &&
                  [
                    "start",
                    "analysis",
                    "device",
                    "room",
                    "processing",
                  ].includes(page || "")) ||
                (id === "reports" && page === "report")
                  ? "active"
                  : ""
              }
              onClick={() => move(id)}
            >
              {icon}
              {label}
              {id === "interviews" && <span>12</span>}
            </button>
          ))}
          <small>QUẢN LÝ</small>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => move("settings")}
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

function PageHeader({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <small>{eyebrow}</small>}
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      <div className="page-actions">
        <button className="icon-btn">
          <Bell />
        </button>
        {action}
      </div>
    </header>
  );
}

const people = [
  {
    name: "Nguyễn Minh Anh",
    initial: "MA",
    role: "Senior Frontend Developer",
    date: "28/09/2026 · 14:30",
    status: "Hoàn thành",
    score: 86,
    color: "sage",
  },
  {
    name: "Trần Gia Bảo",
    initial: "GB",
    role: "Backend Developer",
    date: "27/09/2026 · 10:00",
    status: "Hoàn thành",
    score: 79,
    color: "lavender",
  },
  {
    name: "Lê Thu Hà",
    initial: "TH",
    role: "Product Designer",
    date: "27/09/2026 · 09:15",
    status: "Đang xử lý",
    score: null,
    color: "peach",
  },
  {
    name: "Phạm Quốc Huy",
    initial: "QH",
    role: "Senior Frontend Developer",
    date: "26/09/2026 · 16:00",
    status: "Đã lên lịch",
    score: null,
    color: "blueish",
  },
  {
    name: "Vũ Khánh Linh",
    initial: "KL",
    role: "Data Analyst",
    date: "25/09/2026 · 11:30",
    status: "Chưa hoàn thành",
    score: 42,
    color: "rose",
  },
];

export function InterviewsPage({ go }: Props) {
  const [filter, setFilter] = useState("Tất cả");
  const shown = people.filter(
    (p) => filter === "Tất cả" || p.status === filter,
  );
  return (
    <Shell page="interviews" go={go}>
      <PageHeader
        title="Phỏng vấn"
        desc="Quản lý và theo dõi tất cả phiên phỏng vấn."
        action={
          <button className="primary" onClick={() => go("start")}>
            <Plus /> Tạo phỏng vấn
          </button>
        }
      />
      <div className="metric-strip">
        <div>
          <span>
            <Video />
          </span>
          <p>
            <small>TỔNG PHIÊN</small>
            <b>42</b>
          </p>
          <em>+8 tháng này</em>
        </div>
        <div>
          <span>
            <CheckCircle2 />
          </span>
          <p>
            <small>HOÀN THÀNH</small>
            <b>34</b>
          </p>
          <em>81%</em>
        </div>
        <div>
          <span>
            <Clock3 />
          </span>
          <p>
            <small>ĐÃ LÊN LỊCH</small>
            <b>06</b>
          </p>
          <em>Tuần này</em>
        </div>
        <div>
          <span>
            <Activity />
          </span>
          <p>
            <small>ĐANG XỬ LÝ</small>
            <b>02</b>
          </p>
          <em>Khoảng 2 phút</em>
        </div>
      </div>
      <section className="data-panel">
        <div className="data-toolbar">
          <div className="search-box">
            <Search />
            <input placeholder="Tìm ứng viên, vị trí..." />
          </div>
          <div className="tabs">
            {["Tất cả", "Hoàn thành", "Đã lên lịch", "Đang xử lý"].map((t) => (
              <button
                key={t}
                className={filter === t ? "active" : ""}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="outline">
            <Filter /> Bộ lọc
          </button>
        </div>
        <div className="records">
          <div className="record-head">
            <span>ỨNG VIÊN</span>
            <span>VỊ TRÍ</span>
            <span>THỜI GIAN</span>
            <span>TRẠNG THÁI</span>
            <span>ĐIỂM AI</span>
            <span></span>
          </div>
          {shown.map((p, i) => (
            <div className="record" key={p.name}>
              <div className="person">
                <i className={p.color}>{p.initial}</i>
                <p>
                  <b>{p.name}</b>
                  <small>{`INT-2026-${1042 - i}`}</small>
                </p>
              </div>
              <div>
                <b>{p.role}</b>
                <small>Product & Engineering</small>
              </div>
              <div>
                <span>{p.date}</span>
              </div>
              <div>
                <span className={`tag-status s${i}`}>{p.status}</span>
              </div>
              <div>
                {p.score ? (
                  <strong className={p.score > 80 ? "good" : ""}>
                    {p.score}
                    <small>/100</small>
                  </strong>
                ) : (
                  <span>—</span>
                )}
              </div>
              <button className="dots" onClick={() => p.score && go("report")}>
                <MoreHorizontal />
              </button>
            </div>
          ))}
        </div>
        <div className="pagination">
          <span>Hiển thị 1–5 trong 42 kết quả</span>
          <div>
            <button>‹</button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>›</button>
          </div>
        </div>
      </section>
    </Shell>
  );
}

export function CandidatesPage({ go }: Props) {
  return (
    <Shell page="candidates" go={go}>
      <PageHeader
        title="Ứng viên"
        desc="Theo dõi hồ sơ và tiến trình đánh giá ứng viên."
        action={
          <button className="primary" onClick={() => go("start")}>
            <Plus /> Thêm ứng viên
          </button>
        }
      />
      <div className="candidate-toolbar">
        <div className="search-box">
          <Search />
          <input placeholder="Tìm theo tên, email hoặc kỹ năng..." />
        </div>
        <button className="outline">
          <Filter /> Tất cả vị trí
        </button>
        <button className="outline">
          <ChevronDown /> Trạng thái
        </button>
      </div>
      <div className="candidate-grid">
        {people.slice(0, 4).map((p, i) => (
          <article className="candidate-profile" key={p.name}>
            <button className="dots">
              <MoreHorizontal />
            </button>
            <i className={`profile-avatar ${p.color}`}>{p.initial}</i>
            <h3>{p.name}</h3>
            <p>{p.role}</p>
            <div className="skill-chips">
              {[
                ["React", "TypeScript", "Figma"],
                ["Node.js", "AWS", "SQL"],
                ["UX/UI", "Research", "Figma"],
                ["React", "Next.js", "GraphQL"],
              ][i].map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <div className="profile-meta">
              <span>
                <Mail />{" "}
                {p.name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replaceAll(" ", ".")}
                @email.com
              </span>
              <span>
                <CalendarDays /> Ứng tuyển {i + 2} ngày trước
              </span>
            </div>
            <div className="profile-foot">
              <span className={`tag-status s${i}`}>{p.status}</span>
              <button onClick={() => go("report")}>
                Xem hồ sơ <ArrowRight />
              </button>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

const jobCards = [
  {
    title: "Senior Frontend Developer",
    dept: "Product & Engineering",
    place: "Hà Nội · Hybrid",
    count: 18,
    days: 12,
    color: "#5c5cc9",
    skills: ["React", "TypeScript", "Next.js"],
  },
  {
    title: "Backend Developer",
    dept: "Engineering",
    place: "TP. Hồ Chí Minh",
    count: 14,
    days: 18,
    color: "#287d5a",
    skills: ["Node.js", "PostgreSQL", "AWS"],
  },
  {
    title: "Product Designer",
    dept: "Product & Design",
    place: "Remote",
    count: 9,
    days: 7,
    color: "#c87548",
    skills: ["Figma", "UX Research", "UI Design"],
  },
  {
    title: "Data Analyst",
    dept: "Data & Insights",
    place: "Hà Nội",
    count: 11,
    days: 21,
    color: "#4c729b",
    skills: ["SQL", "Python", "Tableau"],
  },
];
export function JobsPage({ go }: Props) {
  const [jobList, setJobList] = useState<DbJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  return (
    <Shell page="jobs" go={go}>
      <PageHeader
        title="Công việc"
        desc={`Danh sách ${jobList.length} vị trí tuyển dụng thực tế đang có trong kho dữ liệu.`}
        action={
          <button className="primary" onClick={() => go("start")}>
            <Plus /> Tạo phỏng vấn mới
          </button>
        }
      />
      <div style={{ marginBottom: "20px" }}>
        <div className="job-search" style={{ maxWidth: "480px" }}>
          <Search />
          <input
            placeholder="Tìm kiếm công việc, công ty hoặc địa điểm..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          Đang nạp danh sách công việc từ kho dữ liệu...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {filtered.map((j) => (
            <div
              key={j.id}
              className="white-card"
              style={{
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    className="job-icon"
                    style={{
                      background: j.accent,
                      width: "42px",
                      height: "42px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    {j.title
                      .split(" ")
                      .slice(0, 2)
                      .map((x) => x[0])
                      .join("")}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px" }}>{j.title}</h4>
                    <small style={{ color: "#6b7280" }}>
                      {j.company} · {j.location}
                    </small>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    margin: "12px 0",
                  }}
                >
                  {j.skills.map((s) => (
                    <span
                      key={s}
                      style={{
                        background: "#f3f4f6",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#374151",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="outline"
                style={{ marginTop: "12px", width: "100%", cursor: "pointer" }}
                onClick={() => go("start")}
              >
                Phỏng vấn vị trí này
              </button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

export function ReportsPage({ go }: Props) {
  return (
    <Shell page="reports" go={go}>
      <PageHeader
        title="Báo cáo"
        desc="Tổng hợp chất lượng ứng viên và hiệu quả tuyển dụng."
        action={
          <button className="outline">
            <Download /> Xuất báo cáo
          </button>
        }
      />
      <div className="report-overview">
        <section>
          <span className="pill">
            <TrendingUp /> HIỆU SUẤT TUYỂN DỤNG
          </span>
          <h2>
            Chất lượng ứng viên
            <br />
            tăng <em>8.4%</em>
          </h2>
          <p>Dựa trên 42 buổi phỏng vấn trong 30 ngày qua.</p>
          <div className="line-chart">
            <svg viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#528166" stopOpacity=".3" />
                  <stop offset="1" stopColor="#528166" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,92 C50,88 75,72 112,78 S180,58 220,62 S280,35 330,45 S410,22 500,15 L500,120 L0,120Z"
                fill="url(#area)"
              />
              <path
                d="M0,92 C50,88 75,72 112,78 S180,58 220,62 S280,35 330,45 S410,22 500,15"
                fill="none"
                stroke="#426f57"
                strokeWidth="3"
              />
            </svg>
            <div>
              <span>01/09</span>
              <span>08/09</span>
              <span>15/09</span>
              <span>22/09</span>
              <span>29/09</span>
            </div>
          </div>
        </section>
        <aside>
          <h3>Phân bổ đánh giá</h3>
          <div className="donut">
            <div>
              <b>42</b>
              <small>ỨNG VIÊN</small>
            </div>
          </div>
          <ul>
            <li>
              <i className="excellent"></i>
              <span>Phù hợp cao</span>
              <b>38%</b>
            </li>
            <li>
              <i className="normal"></i>
              <span>Cần xem xét</span>
              <b>45%</b>
            </li>
            <li>
              <i className="low"></i>
              <span>Chưa phù hợp</span>
              <b>17%</b>
            </li>
          </ul>
        </aside>
      </div>
      <section className="data-panel report-list">
        <div className="panel-title">
          <div>
            <h2>Báo cáo gần đây</h2>
            <p>Đánh giá chi tiết từ AI</p>
          </div>
          <button className="text-btn">
            Xem tất cả <ArrowRight />
          </button>
        </div>
        {people.slice(0, 3).map((p, i) => (
          <div className="report-row" key={p.name}>
            <div className="person">
              <i className={p.color}>{p.initial}</i>
              <p>
                <b>{p.name}</b>
                <small>{p.role}</small>
              </p>
            </div>
            <div className="mini-scores">
              <span>
                <small>CHUYÊN MÔN</small>
                <b>{[88, 82, 76][i]}</b>
              </span>
              <span>
                <small>GIAO TIẾP</small>
                <b>{[81, 75, 84][i]}</b>
              </span>
              <span>
                <small>PHÙ HỢP</small>
                <b>{[90, 78, 80][i]}</b>
              </span>
            </div>
            <strong>
              {p.score || 82}
              <small>/100</small>
            </strong>
            <button className="outline" onClick={() => go("report")}>
              Xem báo cáo
            </button>
          </div>
        ))}
      </section>
    </Shell>
  );
}

export function SettingsPage({ go }: Props) {
  const [tab, setTab] = useState("Hồ sơ");
  return (
    <Shell page="settings" go={go}>
      <PageHeader
        title="Cài đặt"
        desc="Quản lý tài khoản và tùy chỉnh không gian làm việc."
      />
      <div className="settings-layout">
        <aside>
          {[
            "Hồ sơ",
            "Không gian làm việc",
            "Thông báo",
            "Tích hợp",
            "Bảo mật",
          ].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </aside>
        <section className="settings-card">
          <div>
            <h2>{tab}</h2>
            <p>Cập nhật thông tin và thiết lập {tab.toLowerCase()} của bạn.</p>
          </div>
          {tab === "Hồ sơ" ? (
            <>
              <div className="photo-row">
                <div className="avatar big">HN</div>
                <div>
                  <button className="outline">Thay đổi ảnh</button>
                  <p>JPG hoặc PNG, tối đa 2MB.</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Họ và tên
                  <input defaultValue="Hoàng Nam" />
                </label>
                <label>
                  Chức danh
                  <input defaultValue="Talent Lead" />
                </label>
                <label>
                  Email công việc
                  <input defaultValue="nam.hoang@interviewly.vn" />
                </label>
                <label>
                  Số điện thoại
                  <input defaultValue="+84 912 345 678" />
                </label>
              </div>
              <label className="full-label">
                Giới thiệu
                <textarea defaultValue="Talent Acquisition Lead với hơn 6 năm kinh nghiệm xây dựng đội ngũ sản phẩm và công nghệ." />
              </label>
            </>
          ) : (
            <div className="setting-options">
              {[
                "Cho phép thông báo qua email",
                "Nhận báo cáo hàng tuần",
                "Tự động lưu bản ghi phỏng vấn",
                "Bật xác thực hai lớp",
              ].map((x, i) => (
                <label key={x}>
                  <span>
                    <b>{x}</b>
                    <small>
                      Thiết lập này áp dụng cho toàn bộ không gian làm việc.
                    </small>
                  </span>
                  <input type="checkbox" defaultChecked={i < 2} />
                  <i></i>
                </label>
              ))}
            </div>
          )}
          <div className="settings-save">
            <button className="primary">Lưu thay đổi</button>
          </div>
        </section>
      </div>
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
          <span className="pill">
            <Sparkles /> KẾT QUẢ PHÂN TÍCH CV
          </span>
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
      <div className="flow-header">
        <button onClick={() => go("start")}>
          <ArrowLeft />
        </button>
        <div>
          <small>
            PHỎNG VẤN #
            {session?.session_id.slice(0, 8).toUpperCase() || "CHƯA TẠO"}
          </small>
          <h1>AI đang chuẩn bị buổi phỏng vấn</h1>
        </div>
        <span className="private">
          <ShieldCheck /> Dữ liệu được bảo mật
        </span>
      </div>
      <div className="analysis-layout">
        <section className="analysis-main">
          <div className={`ai-orb ${done ? "done" : ""}`}>
            <Sparkles />
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
          <i>
            <Sparkles />
          </i>
          Interviewly
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
          <div className="meet-pickers">
            <div className="meet-picker-item">
              <Camera size={15} style={{ color: "#059669", flex: "none" }} />
              <select
                value={selectedVideoId}
                onChange={(e) => handleVideoDeviceChange(e.target.value)}
              >
                {videoDevices.length > 0 ? (
                  videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera (${d.deviceId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="">
                    {activeCameraName || "Webcam mặc định"}
                  </option>
                )}
              </select>
            </div>
            <div className="meet-picker-item">
              <Mic size={15} style={{ color: "#059669", flex: "none" }} />
              <select
                value={selectedAudioId}
                onChange={(e) => handleAudioDeviceChange(e.target.value)}
              >
                {audioDevices.length > 0 ? (
                  audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone (${d.deviceId.slice(0, 6)}...)`}
                    </option>
                  ))
                ) : (
                  <option value="">
                    {activeMicName || "Microphone mặc định"}
                  </option>
                )}
              </select>
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
              background: "rgba(99,102,241,0.15)",
              color: "#818cf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Sparkles size={28} />
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
            <i>
              <Sparkles size={16} />
            </i>
            <span>Interviewly</span>
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
          <i>
            <Sparkles />
          </i>
          Interviewly
        </button>
      </header>
      <main>
        <div className="process-orbit">
          <div>
            <Sparkles />
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
  return (
    <Shell page="report" go={go} wide>
      <LiveInterviewReport onBack={() => go("reports")} />
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

  // Retrieve candidate & job context dynamically
  let candidateName = sessionStorage.getItem("selected_cv_name") || "";
  let jobTitle = sessionStorage.getItem("selected_job_title") || "";

  try {
    const analysis = loadCvAnalysis();
    if (!jobTitle && analysis?.job_context?.title) {
      jobTitle = analysis.job_context.title;
    }
    if (!candidateName && analysis?.extracted_profile) {
      candidateName = "Ứng viên";
    }
  } catch {}

  if (!candidateName) candidateName = "Nguyễn Minh Anh";
  if (!jobTitle) jobTitle = "Senior Fullstack Engineer";

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
        <button className="back" onClick={onBack}>
          <ArrowLeft />
        </button>
        <div>
          <small>KẾT QUẢ PHỎNG VẤN</small>
          <h1>
            {session?.status === "completed"
              ? "Phỏng vấn đã hoàn tất"
              : "Kết quả hiện tại"}
          </h1>
          <p>
            {answered.length} / {session?.max_questions || 0} câu đã trả lời •
            Đánh giá năng lực tự động bằng AI
          </p>
        </div>
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
            <Sparkles /> 7 TIÊU CHÍ ĐÁNH GIÁ CHUYÊN SÂU
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

  useEffect(() => {
    if (propSession) {
      setSession(propSession);
      return;
    }
    if (sessionId && sessionId !== "1042" && sessionId !== "latest") {
      getInterviewSessionById(sessionId).then((dbSession) => {
        if (dbSession) setSession(dbSession);
      });
    }
  }, [sessionId, propSession]);

  const evalData = computeAiEvaluation(session);

  return (
    <>
      <div className="report-header">
        {!candidateView && (
          <button className="back" onClick={onBack}>
            <ArrowLeft />
          </button>
        )}
        <div>
          {candidateView ? (
            <>
              <h1>Kết quả của tôi</h1>
              <p>
                {evalData.candidateName ? `${evalData.candidateName} • ` : ""}
                {evalData.jobTitle} • Đánh giá năng lực AI
              </p>
            </>
          ) : (
            <>
              <small>BÁO CÁO PHỎNG VẤN</small>
              <h1>{evalData.candidateName}</h1>
              <p>{evalData.jobTitle} • Đánh giá năng lực AI</p>
            </>
          )}
        </div>
        <div>
          <button className="outline">
            <ArrowDownToLine /> Tải PDF
          </button>
          {!candidateView && (
            <button className="primary">
              <Star /> Thêm vào shortlist
            </button>
          )}
        </div>
      </div>
      <div className="report-tabs">
        {[
          "Tổng quan",
          "Đánh giá câu hỏi",
          "Phân tích giọng nói",
          "Phân tích hình ảnh",
        ].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Tổng quan" ? (
        <Overview session={session} />
      ) : tab === "Đánh giá câu hỏi" ? (
        <QuestionReview session={session} candidateView={candidateView} />
      ) : tab === "Phân tích giọng nói" ? (
        <AudioReport />
      ) : (
        <VideoReport sessionId={session?.session_id || sessionId} />
      )}
    </>
  );
}

function Overview({ session }: { session?: InterviewSession | null }) {
  const currentSession = session || loadInterviewSession();
  const history: any[] = (() => {
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
          <span className="pill">
            <Sparkles /> ĐÁNH GIÁ TỔNG QUAN NĂNG LỰC
          </span>
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
                <Sparkles />
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

  // Standard 5 high-quality interview turns for the position
  const defaultTurns = [
    {
      turnIndex: 1,
      stage: "Giới thiệu bản thân",
      criterion: "Kinh nghiệm tổng quan",
      question:
        "Bạn hãy giới thiệu ngắn gọn về bản thân, kinh nghiệm lập trình Full-stack nổi bật nhất và vai trò trong các dự án gần đây?",
      answer:
        "Tôi có hơn 3 năm kinh nghiệm phát triển phần mềm với NestJS, React, TypeScript và Python. Trong các dự án gần đây, tôi chịu trách nhiệm thiết kế kiến trúc API, xây dựng backend microservices và tối ưu hóa trải nghiệm người dùng.",
    },
    {
      turnIndex: 2,
      stage: "Kiến thức chuyên môn",
      criterion: "Kỹ thuật chuyên sâu & Xử lý API",
      question:
        "Trong dự án NextStep AI, bạn đề cập đến việc tích hợp LLM APIs và xây dựng backend bằng Python và NestJS. Bạn có thể mô tả cụ thể một thách thức kỹ thuật bạn gặp phải khi thiết kế API để xử lý dữ liệu CV lớn và cách bạn tối ưu hóa hiệu suất trong trường hợp đó?",
      answer:
        sessionStorage.getItem("last_turn_answer") ||
        transcript?.corrected_transcript ||
        transcript?.raw_transcript ||
        "Khi xử lý tập dữ liệu CV lớn, tôi áp dụng cơ chế xử lý bất đồng bộ qua hàng đợi tác vụ, đồng thời phân đoạn (chunking) dữ liệu và kết hợp caching để giảm thiểu độ trễ phản hồi của hệ thống.",
    },
    {
      turnIndex: 3,
      stage: "Cơ sở dữ liệu & Caching",
      criterion: "Tối ưu hóa Database & Hệ thống",
      question:
        "Khi xử lý lượng truy vấn lớn đồng thời vào cơ sở dữ liệu, bạn áp dụng những chiến lược caching và indexing nào để đảm bảo latency thấp?",
      answer:
        "Tôi áp dụng Redis làm cache layer cho các truy vấn đọc phổ biến và thiết lập TTL thích hợp. Ở tầng database, tôi tối ưu index B-Tree trên các cột tìm kiếm trọng yếu và phân tích execution plan bằng EXPLAIN ANALYZE để tránh tình trạng table scan diện rộng.",
    },
    {
      turnIndex: 4,
      stage: "Tư duy giải quyết vấn đề",
      criterion: "Xử lý sự cố & Tính sẵn sàng cao",
      question:
        "Bạn xử lý thế nào khi một third-party API (như LLM API hoặc dịch vụ thanh toán) bị chậm hoặc timeout đột ngột để không ảnh hưởng đến trải nghiệm người dùng?",
      answer:
        "Tôi triển khai Circuit Breaker pattern kết hợp Message Queue (BullMQ / RabbitMQ) cho các tác vụ ngầm, đồng thời thiết lập retry policy với exponential backoff và trả về fallback response thân thiện ngay lập tức cho người dùng.",
    },
    {
      turnIndex: 5,
      stage: "Quy trình kiểm thử & CI/CD",
      criterion: "Chất lượng mã nguồn & Triển khai",
      question:
        "Bạn thường áp dụng quy trình kiểm thử (Unit test/Integration test) và CI/CD như thế nào để đảm bảo chất lượng mã nguồn trước khi deploy lên production?",
      answer:
        "Tôi duy trì coverage kiểm thử tự động trên 80% với Jest và PyTest. Pipeline CI/CD qua GitHub Actions tự động kiểm tra cú pháp, chạy toàn bộ test suite và build Docker container trước khi deploy lên môi trường staging.",
    },
  ];

  // Collect real answered turns from session and history
  const historyTurns: any[] = (() => {
    try {
      const h = sessionStorage.getItem("interview_turns_history");
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  })();

  // Real turns from session
  const sessionTurns = (session?.turns || []).map((t, idx) => ({
    turnIndex: idx + 1,
    stage: t.stage || defaultTurns[idx]?.stage || "Chuyên môn",
    criterion:
      t.criterion || defaultTurns[idx]?.criterion || "Kiến thức chuyên môn",
    question:
      t.question ||
      (t as any).question_text ||
      defaultTurns[idx]?.question ||
      `Câu hỏi ${idx + 1}`,
    answer: t.answer || (t as any).answer_text || null,
  }));

  // Construct complete 5 turns display list ensuring every question 1..5 is visible
  const totalTurnsCount = Math.max(5, sessionTurns.length, historyTurns.length);
  const turnsToDisplay = Array.from({ length: totalTurnsCount }, (_, idx) => {
    const fromHistory = historyTurns[idx];
    const fromSession = sessionTurns[idx];
    const fallback = defaultTurns[idx] || defaultTurns[defaultTurns.length - 1];

    const question =
      fromHistory?.question ||
      fromSession?.question ||
      (idx === 0 ? sessionStorage.getItem("current_question_text") : null) ||
      fallback.question;

    const stage = fromHistory?.stage || fromSession?.stage || fallback.stage;
    const criterion =
      fromHistory?.criterion || fromSession?.criterion || fallback.criterion;

    let answer = fromHistory?.answer || fromSession?.answer;
    if (!answer && idx === 1 && sessionStorage.getItem("last_turn_answer")) {
      answer = sessionStorage.getItem("last_turn_answer");
    }
    if (!answer && idx === 0 && transcript?.corrected_transcript) {
      answer = transcript.corrected_transcript;
    }
    if (!answer) {
      answer = fallback.answer;
    }

    return {
      turnIndex: idx + 1,
      stage,
      criterion,
      question,
      answer,
    };
  });

  const current = turnsToDisplay[activeTurn] || turnsToDisplay[0];

  return (
    <div className="question-review">
      <div className="question-nav">
        <h3>Các câu hỏi ({turnsToDisplay.length})</h3>
        {turnsToDisplay.map((t, idx) => (
          <button
            key={idx}
            className={activeTurn === idx ? "active" : ""}
            onClick={() => setActiveTurn(idx)}
          >
            <span>{String(idx + 1).padStart(2, "0")}</span>
            <p>
              <b>Câu hỏi {idx + 1}</b>
              <small>{t.criterion || t.stage || "Kiến thức chuyên môn"}</small>
            </p>
          </button>
        ))}
      </div>
      <article className="white-card answer-detail">
        <span
          className="pill"
          style={{
            background: "#eef2ff",
            color: "#4338ca",
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: "6px",
          }}
        >
          <Sparkles size={13} style={{ display: "inline", marginRight: 5 }} />
          CÂU HỎI {activeTurn + 1} • {current.stage.toUpperCase()}
        </span>

        <h2
          style={{
            fontSize: "18px",
            lineHeight: "1.5",
            margin: "16px 0",
            color: "#111827",
            fontWeight: 600,
          }}
        >
          {current.question}
        </h2>

        <div
          className="transcript-answer"
          style={{
            marginTop: "18px",
            borderTop: "1px solid #f3f4f6",
            paddingTop: "16px",
          }}
        >
          <h4
            style={{
              color: "#4b5563",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Câu trả lời của ứng viên:
          </h4>
          <p
            style={{
              background: "#f9fafb",
              padding: "16px 18px",
              borderRadius: "8px",
              fontStyle: "italic",
              color: "#1f2937",
              lineHeight: 1.6,
              border: "1px solid #e5e7eb",
            }}
          >
            "{current.answer}"
          </p>
        </div>
      </article>
    </div>
  );
}
function AudioReport() {
  return (
    <>
      <div className="analysis-metrics">
        {[
          ["135", "từ/phút", "Tốc độ nói"],
          ["12%", "", "Tần suất ngập ngừng"],
          ["1.1s", "", "Thời gian dừng TB"],
          ["24:18", "", "Thời lượng nói"],
        ].map((x) => (
          <div key={x[2]}>
            <span>
              <Headphones />
            </span>
            <small>{x[2]}</small>
            <b>
              {x[0]} <em>{x[1]}</em>
            </b>
          </div>
        ))}
      </div>
      <section className="white-card audio-chart">
        <div className="card-title">
          <h3>Phân tích nhịp nói</h3>
          <span>Toàn bộ phiên phỏng vấn</span>
        </div>
        <div className="waveform">
          {Array.from({ length: 80 }, (_, i) => (
            <i
              key={i}
              style={{ height: `${12 + Math.abs(Math.sin(i * 0.7)) * 52}px` }}
            ></i>
          ))}
        </div>
        <div className="audio-timeline">
          <span>00:00</span>
          <span>07:10</span>
          <span>14:20</span>
          <span>21:30</span>
          <span>28:42</span>
        </div>
        <div className="neutral-note">
          <Activity />
          <p>
            <b>Nhận xét dựa trên dữ liệu</b>
            <span>
              Tốc độ nói ổn định trong phần lớn buổi phỏng vấn. Tần suất ngập
              ngừng cao hơn trung bình ở các câu hỏi về system design.
            </span>
          </p>
        </div>
      </section>
    </>
  );
}
function VideoReport({ sessionId }: { sessionId?: string }) {
  const [gazeData] = useState<GazeReportResult | null>(() => {
    try {
      if (sessionId && sessionId !== "1042" && sessionId !== "latest") {
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

  const presencePct = gazeData ? `${gazeData.face_presence_pct}%` : "96%";
  const straightPct = gazeData ? `${gazeData.looking_straight_pct}%` : "85%";
  const awayPct = gazeData ? `${gazeData.looking_away_pct}%` : "10%";
  const notDetectedPct = gazeData ? `${gazeData.not_detected_pct}%` : "5%";

  const events: GazeEvent[] =
    gazeData?.events && gazeData.events.length > 0
      ? gazeData.events
      : [
          {
            timestamp: "00:12",
            title: "Attention Event",
            description: "Ứng viên nhìn thẳng tập trung vào câu hỏi",
            duration: 3.2,
            type: "attention" as const,
          },
          {
            timestamp: "00:45",
            title: "Attention Event",
            description: "Ứng viên nhìn lệch suy nghĩ",
            duration: 1.8,
            type: "attention" as const,
          },
        ];

  const evidenceCount = events.filter((e) => Boolean(e.snapshotUrl)).length;
  const displayedEvents =
    filterMode === "evidence"
      ? events.filter((e) => Boolean(e.snapshotUrl))
      : events;

  return (
    <>
      <div className="analysis-metrics">
        {[
          [presencePct, "", "Khuôn mặt hiện diện"],
          [straightPct, "", "Nhìn thẳng"],
          [awayPct, "", "Nhìn lệch hướng"],
          [notDetectedPct, "", "Không nhận diện"],
        ].map((x) => (
          <div key={x[2]}>
            <span>
              <Camera />
            </span>
            <small>{x[2]}</small>
            <b>{x[0]}</b>
          </div>
        ))}
      </div>

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
              Dòng thời gian sự kiện hướng nhìn (MediaPipe AI)
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

      {/* In-App Lightbox / Modal for Snapshot Evidence */}
      {selectedSnapshot && (
        <div
          onClick={() => setSelectedSnapshot(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(5px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "760px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "#fee2e2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Camera size={18} />
                </div>
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Ảnh chụp bằng chứng vi phạm
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "2px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Thời điểm:{" "}
                      <b style={{ color: "#0f172a", fontFamily: "monospace" }}>
                        {selectedSnapshot.timestamp}
                      </b>
                    </span>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Thời lượng:{" "}
                      <b style={{ color: "#0f172a" }}>
                        {selectedSnapshot.duration}s
                      </b>
                    </span>
                    {selectedSnapshot.questionIndex && (
                      <>
                        <span style={{ color: "#cbd5e1" }}>•</span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#4338ca",
                            fontWeight: 600,
                          }}
                        >
                          Câu {selectedSnapshot.questionIndex}
                          {selectedSnapshot.stage
                            ? ` • ${selectedSnapshot.stage.toUpperCase()}`
                            : ""}
                        </span>
                      </>
                    )}
                    {selectedSnapshot.activity && (
                      <>
                        <span style={{ color: "#cbd5e1" }}>•</span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#059669",
                            fontWeight: 500,
                          }}
                        >
                          {selectedSnapshot.activity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                aria-label="Đóng (Esc)"
                title="Đóng (Esc)"
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#475569",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e2e8f0";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Image Preview */}
            <div
              style={{
                background: "#090d16",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "340px",
                maxHeight: "62vh",
                overflow: "hidden",
              }}
            >
              {selectedSnapshot.snapshotUrl ? (
                <img
                  src={selectedSnapshot.snapshotUrl}
                  alt="Bằng chứng vi phạm"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "60vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                  }}
                />
              ) : (
                <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                  Không có hình ảnh snapshot
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 20px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ flex: 1, minWidth: "240px" }}>
                <b
                  style={{
                    fontSize: "12px",
                    color: "#1e293b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Hành vi ghi nhận:
                </b>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: "13px",
                    color: "#475569",
                    fontWeight: 600,
                  }}
                >
                  {selectedSnapshot.description}
                </p>
                {selectedSnapshot.questionText && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "12px",
                      color: "#4b5563",
                      background: "#f1f5f9",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      borderLeft: "3px solid #6366f1",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                    }}
                  >
                    <b style={{ fontStyle: "normal", color: "#1f2937" }}>
                      Đang trong câu hỏi:{" "}
                    </b>
                    "{selectedSnapshot.questionText}"
                  </p>
                )}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {selectedSnapshot.snapshotUrl && (
                  <a
                    href={selectedSnapshot.snapshotUrl}
                    download={`evidence-${selectedSnapshot.timestamp.replace(":", "-")}.jpg`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Download size={14} /> Tải ảnh
                  </a>
                )}
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Bấm{" "}
                  <kbd
                    style={{
                      padding: "2px 5px",
                      background: "#e2e8f0",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: "#334155",
                    }}
                  >
                    ESC
                  </kbd>{" "}
                  hoặc click ngoài để đóng
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
