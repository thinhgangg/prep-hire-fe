export const AUTH_TOKEN_KEY = "prephire-token";
export const AUTH_USER_KEY = "prephire-user";
export const AUTH_ROLE_KEY = "prephire-role";
export const UNAUTHORIZED_EVENT = "prephire:unauthorized";

const USER_SCOPED_EXACT_KEYS = [
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AUTH_ROLE_KEY,
  "current_user_id",
  "current_user_name",
  "pbl6-cv-analysis",
  "pbl6-ai-interview-session",
  "prephire-gaze-result",
  "prephire-stt-job-id",
  "prephire-stt-result",
  "pbl6-demo-gaze-result",
  "pbl6-demo-stt-job-id",
  "pbl6-demo-stt-result",
];

const USER_SCOPED_PREFIXES = [
  "interview_session_",
  "gaze_result_",
  "user_db_sessions_",
];

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
}

export function getAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export function notifyUnauthorized(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  } catch {
    // Ignore in non-DOM test environments
  }
}

function clearStorageByPolicy(storage: Storage): void {
  for (const key of USER_SCOPED_EXACT_KEYS) {
    storage.removeItem(key);
  }
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    if (USER_SCOPED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

export function clearAllUserScopedCaches(): void {
  if (typeof window === "undefined") return;
  try {
    clearStorageByPolicy(sessionStorage);
  } catch {
    // Ignore storage errors
  }
  try {
    clearStorageByPolicy(localStorage);
  } catch {
    // Ignore storage errors
  }
}

