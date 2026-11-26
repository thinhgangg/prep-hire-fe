import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_TOKEN_KEY,
  clearAllUserScopedCaches,
  getAuthHeaders,
  getAuthToken,
} from "@/services/authStorage";

describe("authStorage security & cache isolation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("reads JWT token from localStorage when sessionStorage is empty (new tab)", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "jwt-from-local");
    expect(getAuthToken()).toBe("jwt-from-local");
    expect(getAuthHeaders()).toEqual({ Authorization: "Bearer jwt-from-local" });
  });

  it("prefers sessionStorage token over localStorage", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "old-local");
    sessionStorage.setItem(AUTH_TOKEN_KEY, "fresh-session");
    expect(getAuthToken()).toBe("fresh-session");
  });

  it("purges all user-scoped session, CV, and gaze caches on logout", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "tok-1");
    localStorage.setItem("pbl6-cv-analysis", '{"score":80}');
    localStorage.setItem("interview_session_abc", '{"session_id":"abc"}');
    localStorage.setItem("gaze_result_abc", '{"face_presence_pct":90}');
    localStorage.setItem("user_db_sessions_1", "[]");
    localStorage.setItem("unrelated_theme_pref", "light");
    sessionStorage.setItem("pbl6-ai-interview-session", '{"session_id":"abc"}');

    clearAllUserScopedCaches();

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem("pbl6-cv-analysis")).toBeNull();
    expect(localStorage.getItem("interview_session_abc")).toBeNull();
    expect(localStorage.getItem("gaze_result_abc")).toBeNull();
    expect(localStorage.getItem("user_db_sessions_1")).toBeNull();
    expect(sessionStorage.getItem("pbl6-ai-interview-session")).toBeNull();
    // Non-sensitive preferences remain untouched
    expect(localStorage.getItem("unrelated_theme_pref")).toBe("light");
  });
});

