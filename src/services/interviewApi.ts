const AI_API_BASE = (
  import.meta.env.VITE_AI_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8001"
).replace(/\/$/, "");

export type TurnEvidenceScores = {
  answer_relevance: number;
  technical_correctness: number;
  expected_signal_coverage: number;
  reasoning_quality: number;
  evidence_quality: number;
  clarity_conciseness: number;
  consistency: number;
};

export type InterviewQuestion = {
  turn_index: number;
  stage: string;
  question: string;
  criterion?: string;
  question_source?: string;
  difficulty?: number;
};

export type InterviewTurn = InterviewQuestion & {
  answer: string | null;
  question_source: string;
  provider_name?: string | null;
  model_name?: string | null;
  generation_latency_ms?: number;
  answer_scoring_latency_ms?: number;
  answer_scorer_version?: string | null;
  answer_evidence?: {
    status?: string;
    scores?: Record<string, number>;
    applicable_scores?: Record<string, number>;
    applicable_criteria?: string[];
    error?: string;
  } | null;
};

export type InterviewSession = {
  session_id: string;
  user_id?: number | null;
  status: string;
  language: string;
  max_questions: number;
  current_turn_index?: number;
  current_stage: string;
  current_question: InterviewQuestion | null;
  turns: InterviewTurn[];
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  cv_profile_json?: any;
  job_profile_json?: any;
};

export function getSessionCandidateName(
  session?: InterviewSession | null,
): string {
  if (!session) return "Ứng viên";
  const cv = session.cv_profile_json || {};
  if (cv.name && typeof cv.name === "string" && cv.name.trim()) {
    return cv.name.trim();
  }
  if (
    cv.candidate_name &&
    typeof cv.candidate_name === "string" &&
    cv.candidate_name.trim()
  ) {
    return cv.candidate_name.trim();
  }
  if (typeof session.user_id === "number" && session.user_id > 0) {
    return `Ứng viên ${session.user_id}`;
  }
  return "Ứng viên";
}

export function getSessionJobTitle(session?: InterviewSession | null): string {
  if (!session) return "Vị trí phỏng vấn";
  const jp = session.job_profile_json || {};
  const cv = session.cv_profile_json || {};
  if (jp.title && jp.title !== "Uploaded JD") return jp.title;
  if (cv.target_role) return cv.target_role;
  if (jp.title) return jp.title;
  return "Vị trí phỏng vấn";
}

export type CvAnalysis = {
  analysis_result_id?: number | null;
  extracted_profile: {
    cv_level: string;
    cv_years_experience: number;
    preferred_locations: string[];
    cv_certifications: string[];
    cv_skills: {
      name: string;
      proficiency: number;
      years_of_experience: number;
    }[];
  };
  job_context: {
    job_id: number;
    title: string;
    source_url: string;
    job_level: string;
    job_years_required: number;
    job_location?: string | null;
    job_is_remote: boolean;
    job_skills: {
      name: string;
      importance: number;
      required_proficiency: number;
    }[];
  };
  job_match: {
    score: number;
    scoreBreakdownJson: Record<string, number | null>;
    missingSkills: string[];
    matchedSkills: string[];
  };
  gap_analysis: {
    skillGap: {
      missing: { skill: string; importance: string; reason: string }[];
      weak: {
        skill: string;
        current_proficiency: number;
        required_proficiency: number;
        gap: number;
      }[];
    };
    experienceGap: {
      required_years: number;
      current_years: number;
      gap_weeks: number;
    };
    levelGap: { cv_level: string; job_level: string; gap_levels: number };
    certificationGap: { required: string[]; have: string[]; missing: string[] };
    recommendedSkills: string[];
  };
  roadmap: {
    phases: {
      phase: number;
      duration_weeks: number;
      title: string;
      skills: {
        skill_name: string;
        priority: number;
        estimated_weeks: number;
      }[];
    }[];
    total_weeks: number;
    estimated_completion: string;
    difficulty_level: string;
  };
  ai_review?: {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    verdict: string;
    source: string;
  } | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  let message = `HTTP ${response.status}`;
  try {
    const body = await response.json();
    message = typeof body.detail === "string" ? body.detail : message;
  } catch {
    // Keep the HTTP status when the server did not return JSON.
  }
  throw new Error(message);
}

// -------------------------------------------------------------
// Các hàm từ HEAD (Hỗ trợ tải lên file CV & JD ngoài hệ thống)
// -------------------------------------------------------------
export async function createSessionWithUpload(params: {
  cvFile?: File | null;
  cvId?: number | null;
  jobId?: number | null;
  jdFile?: File | null;
  jdText?: string | null;
  jobTitle?: string | null;
  jobCompany?: string | null;
  language?: string;
  maxQuestions?: number;
  userId?: number | string | null;
}): Promise<InterviewSession> {
  const form = new FormData();
  if (params.cvFile) form.append("cv_file", params.cvFile);
  if (params.cvId) form.append("cv_id", String(params.cvId));
  if (params.jobId && params.jobId > 0)
    form.append("job_id", String(params.jobId));
  if (params.jdFile) form.append("jd_file", params.jdFile);
  if (params.jdText) form.append("jd_text", params.jdText);
  if (params.jobTitle) form.append("job_title", params.jobTitle);
  if (params.jobCompany) form.append("job_company", params.jobCompany);
  form.append("language", params.language || "vi");
  form.append("max_questions", String(params.maxQuestions || 5));
  form.append("allow_external_ai", "true");
  const effectiveUserId =
    params.userId ?? sessionStorage.getItem("current_user_id");
  if (effectiveUserId !== null && effectiveUserId !== undefined) {
    const cleanNum = String(effectiveUserId).replace(/\D/g, "");
    if (cleanNum) form.append("user_id", cleanNum);
  }

  const res = await fetch(`${AI_API_BASE}/api/v1/interview/sessions/upload`, {
    method: "POST",
    body: form,
  });
  const session = await parseResponse<InterviewSession>(res);
  invalidateSessionsCache();
  return session;
}

export async function createStoredSession(
  jobId: number,
  cvId: number = 52,
  maxQuestions: number = 5,
): Promise<InterviewSession> {
  const res = await fetch(`${AI_API_BASE}/api/v1/interview/demo/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: jobId,
      cv_id: cvId,
      language: "vi",
      max_questions: maxQuestions,
      allow_external_ai: true,
    }),
  });
  const session = await parseResponse<InterviewSession>(res);
  invalidateSessionsCache();
  return session;
}

export async function createCustomSession(
  cvText: string,
  jdText: string,
  maxQuestions: number = 5,
): Promise<InterviewSession> {
  const res = await fetch(`${AI_API_BASE}/api/v1/interview/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cv_text: cvText.length >= 30 ? cvText : cvText + " ".repeat(35),
      jd_text: jdText.length >= 30 ? jdText : jdText + " ".repeat(35),
      language: "vi",
      max_questions: maxQuestions,
      allow_external_ai: true,
    }),
  });
  const session = await parseResponse<InterviewSession>(res);
  invalidateSessionsCache();
  return session;
}

export async function getEvidenceSummary(sessionId: string): Promise<any> {
  const res = await fetch(
    `${AI_API_BASE}/api/v1/interview/sessions/${sessionId}/evidence-summary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  return parseResponse<any>(res);
}

// -------------------------------------------------------------
// Các hàm từ origin/An (Tạo session từ file/text, phân tích CV, nộp câu trả lời)
// -------------------------------------------------------------
export async function createInterviewSession(
  cvFile: File,
  jdText: string,
  maxQuestions = 8,
): Promise<InterviewSession> {
  const form = new FormData();
  form.append("cv_file", cvFile);
  form.append("jd_text", jdText);
  form.append("language", "vi");
  form.append("max_questions", String(maxQuestions));
  form.append("allow_external_ai", "true");
  form.append("research_consent", "false");

  const response = await fetch(
    `${AI_API_BASE}/api/v1/interview/sessions/files`,
    {
      method: "POST",
      body: form,
    },
  );
  return parseResponse<InterviewSession>(response);
}

export async function createInterviewSessionFromText(
  cvText: string,
  jdText: string,
  maxQuestions = 8,
): Promise<InterviewSession> {
  const response = await fetch(`${AI_API_BASE}/api/v1/interview/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cv_text: cvText,
      jd_text: jdText,
      language: "vi",
      max_questions: maxQuestions,
      allow_external_ai: true,
      research_consent: false,
    }),
  });
  return parseResponse<InterviewSession>(response);
}

export async function analyzeCv(
  cvFile: File,
  jdText: string,
): Promise<CvAnalysis> {
  const form = new FormData();
  form.append("cv_file", cvFile);
  form.append("jd_text", jdText);
  form.append("timeframe_weeks", "0");
  form.append("max_skills_per_phase", "4");

  const response = await fetch(`${AI_API_BASE}/api/v1/cv/scan-upload`, {
    method: "POST",
    body: form,
  });
  return parseResponse<CvAnalysis>(response);
}

export async function submitInterviewAnswer(
  sessionId: string,
  answer: string,
): Promise<InterviewSession> {
  const response = await fetch(
    `${AI_API_BASE}/api/v1/interview/sessions/${sessionId}/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answer: answer || "Tôi chưa có câu trả lời cụ thể cho câu hỏi này.",
      }),
    },
  );
  const session = await parseResponse<InterviewSession>(response);
  invalidateSessionsCache();
  return session;
}

// -------------------------------------------------------------
// Các hàm lưu trữ trạng thái phiên phỏng vấn & CV (SessionStorage + LocalStorage)
// -------------------------------------------------------------
export const INTERVIEW_SESSION_STORAGE_KEY = "pbl6-ai-interview-session";
export const CV_ANALYSIS_STORAGE_KEY = "pbl6-cv-analysis";

export function saveInterviewSession(session: InterviewSession): void {
  try {
    sessionStorage.setItem(
      INTERVIEW_SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
    localStorage.setItem(
      INTERVIEW_SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
    if (session.session_id) {
      localStorage.setItem(
        `interview_session_${session.session_id}`,
        JSON.stringify(session),
      );
    }
  } catch {}
}

export function loadInterviewSession(
  sessionId?: string,
): InterviewSession | null {
  try {
    if (sessionId && sessionId !== "latest") {
      const byId = localStorage.getItem(`interview_session_${sessionId}`);
      if (byId) return JSON.parse(byId) as InterviewSession;
    }
    const valSession = sessionStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY);
    if (valSession) return JSON.parse(valSession) as InterviewSession;
    const valLocal = localStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY);
    return valLocal ? (JSON.parse(valLocal) as InterviewSession) : null;
  } catch {
    return null;
  }
}

export function saveCvAnalysis(analysis: CvAnalysis): void {
  try {
    sessionStorage.setItem(CV_ANALYSIS_STORAGE_KEY, JSON.stringify(analysis));
    localStorage.setItem(CV_ANALYSIS_STORAGE_KEY, JSON.stringify(analysis));
  } catch {}
}

export function clearCvAnalysis(): void {
  try {
    sessionStorage.removeItem(CV_ANALYSIS_STORAGE_KEY);
    localStorage.removeItem(CV_ANALYSIS_STORAGE_KEY);
  } catch {}
}

export function loadCvAnalysis(): CvAnalysis | null {
  try {
    const value =
      sessionStorage.getItem(CV_ANALYSIS_STORAGE_KEY) ||
      localStorage.getItem(CV_ANALYSIS_STORAGE_KEY);
    return value ? (JSON.parse(value) as CvAnalysis) : null;
  } catch {
    return null;
  }
}

const SESSIONS_CACHE_TTL_MS = 20_000;
let cachedAllSessions: InterviewSession[] | null = null;
let cachedAllSessionsAt = 0;
let inFlightAllSessions: Promise<InterviewSession[]> | null = null;

const userSessionsCache = new Map<
  string,
  { data: InterviewSession[]; at: number }
>();
const inFlightUserSessions = new Map<string, Promise<InterviewSession[]>>();

export function invalidateSessionsCache(): void {
  cachedAllSessions = null;
  cachedAllSessionsAt = 0;
  userSessionsCache.clear();
}

export function getCachedAllSessions(): InterviewSession[] {
  return cachedAllSessions || [];
}

export function getCachedUserSessions(
  userId: number | string,
): InterviewSession[] {
  const cleanId = String(userId).replace(/\D/g, "") || String(userId);
  return userSessionsCache.get(cleanId)?.data || [];
}

export async function getInterviewSessionById(
  sessionId: string,
): Promise<InterviewSession | null> {
  if (!sessionId || sessionId === "latest") return null;
  try {
    const res = await fetch(
      `${AI_API_BASE}/api/v1/interview/sessions/${sessionId}`,
    );
    if (!res.ok) return null;
    const session = await parseResponse<InterviewSession>(res);
    if (session) {
      saveInterviewSession(session);
    }
    return session;
  } catch {
    return null;
  }
}

export async function getUserSessions(
  userId: number | string,
  forceRefresh = false,
): Promise<InterviewSession[]> {
  const cleanId = String(userId).replace(/\D/g, "") || String(userId);
  const now = Date.now();
  const cached = userSessionsCache.get(cleanId);
  if (!forceRefresh && cached && now - cached.at < SESSIONS_CACHE_TTL_MS) {
    return cached.data;
  }

  const existing = inFlightUserSessions.get(cleanId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(
        `${AI_API_BASE}/api/v1/interview/users/${cleanId}/sessions`,
      );
      if (!res.ok) return cached?.data || [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      userSessionsCache.set(cleanId, { data: list, at: Date.now() });
      return list;
    } catch {
      return cached?.data || [];
    } finally {
      inFlightUserSessions.delete(cleanId);
    }
  })();

  inFlightUserSessions.set(cleanId, promise);
  return promise;
}

export async function getAllSessions(
  limit = 100,
  forceRefresh = false,
): Promise<InterviewSession[]> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedAllSessions &&
    now - cachedAllSessionsAt < SESSIONS_CACHE_TTL_MS
  ) {
    return cachedAllSessions;
  }

  if (inFlightAllSessions) {
    return inFlightAllSessions;
  }

  inFlightAllSessions = (async () => {
    try {
      const res = await fetch(
        `${AI_API_BASE}/api/v1/interview/sessions?limit=${limit}`,
      );
      if (!res.ok) return cachedAllSessions || [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      cachedAllSessions = list;
      cachedAllSessionsAt = Date.now();
      return list;
    } catch {
      return cachedAllSessions || [];
    } finally {
      inFlightAllSessions = null;
    }
  })();

  return inFlightAllSessions;
}
