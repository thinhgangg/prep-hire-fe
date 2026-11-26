import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { RoleGuard } from "../auth/RoleGuard";
import { HOME_BY_ROLE } from "../auth/types";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AuthPage } from "../auth/AuthPage";
import { Dashboard, type Page } from "../App";
import { loadInterviewSession } from "../services/interviewApi";

// Route-level code splitting to keep initial /login bundle lightweight
const CandidatesPage = lazy(() =>
  import("../admin/pages/CandidatesPage").then((m) => ({
    default: m.CandidatesPage,
  })),
);
const JobsPage = lazy(() =>
  import("../admin/pages/JobsPage").then((m) => ({ default: m.JobsPage })),
);
const InterviewsPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.InterviewsPage })),
);
const ReportsPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.ReportsPage })),
);
const ReportPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.ReportPage })),
);
const SettingsPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.SettingsPage })),
);
const HelpCenterPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.HelpCenterPage })),
);
const AnalysisPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.AnalysisPage })),
);
const DeviceCheckPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.DeviceCheckPage })),
);
const InterviewRoom = lazy(() =>
  import("../Pages").then((m) => ({ default: m.InterviewRoom })),
);
const ProcessingPage = lazy(() =>
  import("../Pages").then((m) => ({ default: m.ProcessingPage })),
);

const CandidateHome = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateHome,
  })),
);
const CandidateJobs = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateJobs,
  })),
);
const CandidateCreateInterview = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateCreateInterview,
  })),
);
const CandidateResults = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateResults,
  })),
);
const CandidateResultDetail = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateResultDetail,
  })),
);
const CandidateSettings = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateSettings,
  })),
);
const CandidateHelp = lazy(() =>
  import("../candidate/CandidatePages").then((m) => ({
    default: m.CandidateHelp,
  })),
);

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-600 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        Đang tải trang...
      </div>
    </div>
  );
}

const adminPath: Record<Page, string> = {
  login: "/login",
  dashboard: "/admin/dashboard",
  start: "/admin/interviews",
  interviews: "/admin/interviews",
  candidates: "/admin/candidates",
  jobs: "/admin/jobs",
  reports: "/admin/reports",
  settings: "/admin/settings",
  help: "/admin/help",
  analysis: "/admin/interviews/active/analysis",
  device: "/admin/interviews/active/device-check",
  room: "/admin/interviews/active/room",
  processing: "/admin/interviews/active/processing",
  report: "/admin/reports/latest",
};

function AdminScreen({
  component: Component,
}: {
  component: React.ComponentType<{ go: (page: Page) => void }>;
}) {
  const navigate = useNavigate();
  return <Component go={(page) => navigate(adminPath[page])} />;
}

function CandidateFlow({
  screen,
}: {
  screen: "device" | "room" | "processing";
}) {
  const navigate = useNavigate();
  const go = (page: Page) => {
    const currentSession = loadInterviewSession();
    const targetSessionId = currentSession?.session_id || "latest";
    const paths: Partial<Record<Page, string>> = {
      dashboard: "/app",
      start: "/app/interviews/new",
      device: "/app/interviews/device-check",
      room: "/app/interviews/room",
      processing: "/app/interviews/processing",
      report: `/app/results/${targetSessionId}`,
    };
    navigate(paths[page] || "/app");
  };
  if (screen === "device") return <DeviceCheckPage go={go} />;
  if (screen === "room") return <InterviewRoom go={go} />;
  return <ProcessingPage go={go} />;
}

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <AuthPage
      mode="login"
      onLogin={() => navigate("/admin/dashboard")}
      onCandidate={() => navigate("/app")}
    />
  );
}

function RegisterRoute() {
  const navigate = useNavigate();
  return (
    <AuthPage
      mode="register"
      onLogin={() => navigate("/admin/dashboard")}
      onCandidate={() => navigate("/app")}
    />
  );
}

function RootRedirect() {
  const { user, authLoading } = useAuth();
  if (authLoading) return <PageLoader />;
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : "/login"} replace />;
}

const admin = (node: React.ReactNode) => (
  <RoleGuard roles={["ADMIN", "RECRUITER"]}>{node}</RoleGuard>
);
const adminOnly = (node: React.ReactNode) => (
  <RoleGuard roles={["ADMIN"]}>{node}</RoleGuard>
);
const candidate = (node: React.ReactNode) => (
  <RoleGuard roles={["CANDIDATE"]}>{node}</RoleGuard>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route
          path="/admin/dashboard"
          element={admin(<AdminScreen component={Dashboard} />)}
        />
        <Route
          path="/admin/interviews"
          element={admin(<AdminScreen component={InterviewsPage} />)}
        />
        <Route
          path="/admin/interviews/new"
          element={<Navigate to="/admin/interviews" replace />}
        />
        <Route
          path="/admin/interviews/:id/analysis"
          element={admin(<AdminScreen component={AnalysisPage} />)}
        />
        <Route
          path="/admin/interviews/:id/device-check"
          element={admin(<AdminScreen component={DeviceCheckPage} />)}
        />
        <Route
          path="/admin/interviews/:id/room"
          element={admin(<AdminScreen component={InterviewRoom} />)}
        />
        <Route
          path="/admin/interviews/:id/processing"
          element={admin(<AdminScreen component={ProcessingPage} />)}
        />
        <Route
          path="/admin/candidates"
          element={admin(<AdminScreen component={CandidatesPage} />)}
        />
        <Route
          path="/admin/jobs"
          element={admin(<AdminScreen component={JobsPage} />)}
        />
        <Route
          path="/admin/reports"
          element={admin(<AdminScreen component={ReportsPage} />)}
        />
        <Route
          path="/admin/reports/:id"
          element={admin(<AdminScreen component={ReportPage} />)}
        />
        <Route
          path="/admin/settings"
          element={adminOnly(<AdminScreen component={SettingsPage} />)}
        />
        <Route
          path="/admin/help"
          element={admin(<AdminScreen component={HelpCenterPage} />)}
        />

        <Route path="/app" element={candidate(<CandidateHome />)} />
        <Route path="/app/jobs" element={candidate(<CandidateJobs />)} />
        <Route
          path="/app/interviews/new"
          element={candidate(<CandidateCreateInterview />)}
        />
        <Route
          path="/app/interviews/device-check"
          element={candidate(<CandidateFlow screen="device" />)}
        />
        <Route
          path="/app/interviews/room"
          element={candidate(<CandidateFlow screen="room" />)}
        />
        <Route
          path="/app/interviews/processing"
          element={candidate(<CandidateFlow screen="processing" />)}
        />
        <Route
          path="/app/interviews/:id/device-check"
          element={candidate(<CandidateFlow screen="device" />)}
        />
        <Route
          path="/app/interviews/:id/room"
          element={candidate(<CandidateFlow screen="room" />)}
        />
        <Route
          path="/app/interviews/:id/processing"
          element={candidate(<CandidateFlow screen="processing" />)}
        />
        <Route path="/app/results" element={candidate(<CandidateResults />)} />
        <Route
          path="/app/results/:id"
          element={candidate(<CandidateResultDetail />)}
        />
        <Route
          path="/app/profile"
          element={<Navigate to="/app/settings" replace />}
        />
        <Route path="/app/settings" element={candidate(<CandidateSettings />)} />
        <Route path="/app/help" element={candidate(<CandidateHelp />)} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
