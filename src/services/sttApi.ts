import { getAuthHeaders, notifyUnauthorized } from "./authStorage";

export function getSttApiBase(): string {
  const custom =
    typeof window !== "undefined"
      ? localStorage.getItem("colab_stt_url") ||
        sessionStorage.getItem("colab_stt_url")
      : null;
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, "");
  }
  return (
    import.meta.env.VITE_BE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
}

export function setCustomSttUrl(url: string) {
  if (typeof window === "undefined") return;
  if (url && url.trim()) {
    localStorage.setItem("colab_stt_url", url.trim().replace(/\/$/, ""));
  } else {
    localStorage.removeItem("colab_stt_url");
  }
}

export async function checkSttHealth(): Promise<{
  ok: boolean;
  model?: string;
  device?: string;
  url: string;
}> {
  const base = getSttApiBase();
  try {
    const res = await fetch(`${base}/health`, {
      headers: { "ngrok-skip-browser-warning": "true" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        model: data.model || "small",
        device: data.device || "cpu",
        url: base,
      };
    }
  } catch {}
  return { ok: false, url: base };
}

export type TranscriptEdit = {
  start: number;
  end: number;
  before: string;
  after: string;
  method: string;
  evidence: string;
};

export type TranscriptResult = {
  raw_transcript: string;
  corrected_transcript: string;
  segments: { start: number; end: number; text: string }[];
  edits: TranscriptEdit[];
  needs_review: boolean;
  language: string;
  language_probability?: number | null;
  latency_ms: number;
  inference_ms?: number;
  correction_ms?: number;
  model: string;
};

export type SttJob = {
  id: string;
  interview_id: string;
  question_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  stage: string;
  progress: number;
  result: TranscriptResult | null;
  error: string | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    notifyUnauthorized();
  }
  if (response.ok) return response.json() as Promise<T>;
  let message = `HTTP ${response.status}`;
  try {
    const body = await response.json();
    message = body.detail || message;
  } catch {}
  throw new Error(message);
}

export async function createSttJob(
  audio: Blob,
  context: string,
  interviewId = "session",
  questionId = "question-04",
): Promise<SttJob> {
  const base = getSttApiBase();
  const form = new FormData();
  const extension = audio.type.includes("ogg")
    ? "ogg"
    : audio.type.includes("mp4")
      ? "m4a"
      : "webm";
  form.append("audio", audio, `answer.${extension}`);
  form.append("interview_id", interviewId);
  form.append("question_id", questionId);
  form.append("context", context);
  const response = await fetch(`${base}/api/v1/stt/jobs`, {
    method: "POST",
    headers: getAuthHeaders({ "ngrok-skip-browser-warning": "true" }),
    body: form,
  });
  return parseResponse<SttJob>(response);
}

export async function getSttJob(jobId: string): Promise<SttJob> {
  const base = getSttApiBase();
  const response = await fetch(`${base}/api/v1/stt/jobs/${jobId}`, {
    headers: getAuthHeaders({ "ngrok-skip-browser-warning": "true" }),
  });
  return parseResponse<SttJob>(response);
}

export const STT_JOB_STORAGE_KEY = "prephire-stt-job-id";
export const STT_RESULT_STORAGE_KEY = "prephire-stt-result";
