const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export type DbJob = {
  id: number;
  title: string;
  company: string;
  location: string;
  level?: string | null;
  skills: string[];
  accent: string;
};

export type DemoOptionsResult = {
  jobs: DbJob[];
  cvs: any[];
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

const OPTIONS_CACHE_TTL_MS = 60_000;
let cachedOptions: DemoOptionsResult | null = null;
let cachedAt = 0;
let inFlightOptions: Promise<DemoOptionsResult> | null = null;

function mapJobs(rawJobs: any[]): DbJob[] {
  return rawJobs.map((item: any, idx: number) => ({
    id: item.job_id,
    title: item.title,
    company: item.company_name || "Doanh nghiệp Công nghệ",
    location: item.location || "Việt Nam",
    level: item.level || null,
    accent: ACCENT_COLORS[idx % ACCENT_COLORS.length],
    skills: [
      item.level ? `Level: ${item.level.toUpperCase()}` : "Toàn thời gian",
      item.location || "Việt Nam",
      "Dữ liệu thực",
    ],
  }));
}

export function getCachedRealJobs(): DbJob[] {
  return cachedOptions?.jobs || [];
}

export function getCachedDemoCvs(): any[] {
  return cachedOptions?.cvs || [];
}

export async function fetchDemoOptions(
  forceRefresh = false,
): Promise<DemoOptionsResult> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedOptions &&
    now - cachedAt < OPTIONS_CACHE_TTL_MS
  ) {
    return cachedOptions;
  }

  if (inFlightOptions) {
    return inFlightOptions;
  }

  inFlightOptions = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/interview/demo/options`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const result: DemoOptionsResult = {
        jobs: Array.isArray(data.jobs) ? mapJobs(data.jobs) : [],
        cvs: Array.isArray(data.cvs) ? data.cvs : [],
      };
      cachedOptions = result;
      cachedAt = Date.now();
      return result;
    } catch (err) {
      console.warn("Cannot fetch real jobs:", err);
      return cachedOptions || { jobs: [], cvs: [] };
    } finally {
      inFlightOptions = null;
    }
  })();

  return inFlightOptions;
}

export async function fetchRealJobs(forceRefresh = false): Promise<DbJob[]> {
  const { jobs } = await fetchDemoOptions(forceRefresh);
  return jobs;
}
