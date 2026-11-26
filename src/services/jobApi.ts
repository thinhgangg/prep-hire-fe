import { getAuthHeaders, notifyUnauthorized } from "./authStorage";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export type DbJob = {
  id: number;
  title: string;
  company: string;
  location: string;
  level?: string | null;
  status?: "active" | "closed" | "draft";
  employment_type?: string | null;
  skills: string[];
  accent: string;
};

export type ManagedJobPayload = {
  title: string;
  company_name: string;
  location?: string;
  level?: string;
  employment_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string;
  description: string;
  status?: "active" | "closed" | "draft";
};

const ACCENT_COLORS = [
  "#5b5bd6",
  "#12805c",
  "#d97745",
  "#0284c7",
  "#7c3aed",
  "#db2777",
  "#ca8a04",
  "#0d9488",
];

const JOBS_CACHE_TTL_MS = 60_000;
let cachedJobs: DbJob[] | null = null;
let cachedAt = 0;
let inFlightJobs: Promise<DbJob[]> | null = null;

export function invalidateJobOptionsCache(): void {
  cachedJobs = null;
  cachedAt = 0;
}

function mapJobs(rawJobs: any[]): DbJob[] {
  return rawJobs.map((item: any, idx: number) => ({
    id: item.job_id,
    title: item.title,
    company: item.company_name || "Doanh nghiệp Công nghệ",
    location: item.location || "Việt Nam",
    level: item.level || null,
    status: item.status || "active",
    employment_type: item.employment_type || null,
    accent: ACCENT_COLORS[idx % ACCENT_COLORS.length],
    skills: [
      item.level ? `Level: ${String(item.level).toUpperCase()}` : "Toàn thời gian",
      item.location || "Việt Nam",
    ],
  }));
}

export function getCachedRealJobs(): DbJob[] {
  return cachedJobs || [];
}

export async function fetchRealJobs(forceRefresh = false): Promise<DbJob[]> {
  const now = Date.now();
  if (!forceRefresh && cachedJobs && now - cachedAt < JOBS_CACHE_TTL_MS) {
    return cachedJobs;
  }

  if (inFlightJobs) {
    return inFlightJobs;
  }

  inFlightJobs = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/jobs/?limit=100`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        notifyUnauthorized();
        return [];
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const jobs = Array.isArray(data.jobs) ? mapJobs(data.jobs) : [];
      cachedJobs = jobs;
      cachedAt = Date.now();
      return jobs;
    } catch (err) {
      console.warn("Cannot fetch real jobs:", err);
      return cachedJobs || [];
    } finally {
      inFlightJobs = null;
    }
  })();

  return inFlightJobs;
}

// ============================================================================
// Admin Job CRUD APIs
// ============================================================================

async function parseJson<T>(res: Response): Promise<T> {
  if (res.status === 401) notifyUnauthorized();
  if (res.ok) return res.json() as Promise<T>;
  let msg = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body.detail) msg = body.detail;
  } catch {}
  throw new Error(msg);
}

export async function listManagedJobs(limit = 100): Promise<DbJob[]> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson<{ jobs: any[] }>(res);
  return Array.isArray(data.jobs) ? mapJobs(data.jobs) : [];
}

export async function createManagedJob(
  payload: ManagedJobPayload,
): Promise<DbJob> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const raw = await parseJson<any>(res);
  invalidateJobOptionsCache();
  return mapJobs([raw])[0];
}

export async function updateManagedJob(
  jobId: number,
  payload: Partial<ManagedJobPayload>,
): Promise<DbJob> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`, {
    method: "PATCH",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const raw = await parseJson<any>(res);
  invalidateJobOptionsCache();
  return mapJobs([raw])[0];
}

export async function deleteManagedJob(jobId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await parseJson<{ status: string }>(res);
  invalidateJobOptionsCache();
}
