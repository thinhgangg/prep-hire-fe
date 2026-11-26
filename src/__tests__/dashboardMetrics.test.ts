import { describe, expect, it } from "vitest";
import {
  buildQualityDonutData,
  buildScoreHistogramData,
  buildUserScoreProgressData,
  fillMissingDates,
  getScoreMeta,
  getScoreThresholdColor,
  getScoreTier,
  type EvaluatedSessionItem,
} from "@/utils/dashboardMetrics";
import {
  deduplicateJobSkills,
  getAvatarInitials,
} from "@/utils/scoreMeta";
import {
  getSessionJobTitle,
  type InterviewSession,
} from "@/services/interviewApi";

function makeEvaluated(
  id: string,
  score: number,
  isCompleted: boolean,
  isoDate: string,
): EvaluatedSessionItem {
  const createdAt = `${isoDate}T10:00:00Z`;
  const session: InterviewSession = {
    session_id: id,
    status: isCompleted ? "completed" : "active",
    language: "vi",
    max_questions: 5,
    current_stage: isCompleted ? "completed" : "technical",
    current_question: null,
    created_at: createdAt,
    turns: [],
    job_profile_json: { title: "Software Engineer" },
  };
  return {
    session,
    eval: {
      overallScore: score,
      jobTitle: "Software Engineer",
      competencies: [
        { label: "Chuyên môn", score },
        { label: "Giải quyết VĐ", score },
        { label: "Kinh nghiệm", score },
        { label: "Giao tiếp", score },
      ],
    },
    candidateName: "Ứng viên 1",
    jobTitle: "Software Engineer",
    answeredTurns: isCompleted ? 5 : 1,
    timestamp: new Date(createdAt).getTime(),
    isCompleted,
  };
}

describe("dashboardMetrics utilities", () => {
  it("fills missing dates continuously with zero counts", () => {
    const items = [
      makeEvaluated("s1", 85, true, "2026-11-20"),
      makeEvaluated("s2", 40, false, "2026-11-20"),
      makeEvaluated("s3", 72, true, "2026-11-22"),
    ];
    const series = fillMissingDates(items, "2026-11-20", "2026-11-22");
    expect(series).toHaveLength(3);
    expect(series[0]).toMatchObject({
      isoDate: "2026-11-20",
      completed: 1,
      incomplete: 1,
      total: 2,
    });
    expect(series[1]).toMatchObject({
      isoDate: "2026-11-21",
      completed: 0,
      incomplete: 0,
      total: 0,
    });
    expect(series[2]).toMatchObject({
      isoDate: "2026-11-22",
      completed: 1,
      incomplete: 0,
      total: 1,
    });
  });

  it("charts only completed sessions on user progress with sequential #1..#N labels", () => {
    const items = [
      makeEvaluated("s1", 60, true, "2026-11-18"),
      makeEvaluated("s2", 0, false, "2026-11-19"),
      makeEvaluated("s3", 86, true, "2026-11-20"),
    ];
    const progress = buildUserScoreProgressData(items);
    expect(progress.points).toHaveLength(2);
    expect(progress.points.map((p) => p.orderLabel)).toEqual(["#1", "#2"]);
    expect(progress.points[1].isLatest).toBe(true);
    expect(progress.averageScore).toBe(73);
  });

  it("buckets completed scores into 5 threshold-aligned histogram bins and 3 quality segments", () => {
    const items = [
      makeEvaluated("s1", 15, true, "2026-11-18"),
      makeEvaluated("s2", 55, true, "2026-11-19"),
      makeEvaluated("s3", 88, true, "2026-11-20"),
      makeEvaluated("s4", 42, false, "2026-11-21"), // incomplete: must NOT be counted
    ];
    const hist = buildScoreHistogramData(items);
    expect(hist.find((b) => b.min === 0 && b.max === 25)?.count).toBe(1);
    expect(hist.find((b) => b.min === 50 && b.max === 65)?.count).toBe(1);
    expect(hist.find((b) => b.min === 80 && b.max === 100)?.count).toBe(1);
    expect(hist.reduce((acc, b) => acc + b.count, 0)).toBe(3);

    const donut = buildQualityDonutData(items);
    expect(donut.totalScored).toBe(3);
    expect(donut.segments.reduce((acc, s) => acc + s.count, 0)).toBe(3);
    expect(donut.segments.map((s) => s.count)).toEqual([1, 1, 1]);
  });

  it("classifies score tiers consistently across labels, tones, and bar colors", () => {
    expect(getScoreMeta(85)).toMatchObject({
      label: "Tốt",
      hrLabel: "Phù hợp cao",
      badgeTone: "success",
      hex: "#10B981",
    });
    expect(getScoreMeta(52)).toMatchObject({
      label: "Khá",
      hrLabel: "Cần xem xét",
      badgeTone: "warning",
      hex: "#F59E0B",
    });
    expect(getScoreMeta(14)).toMatchObject({
      label: "Cần cải thiện",
      hrLabel: "Chưa phù hợp",
      badgeTone: "destructive",
      hex: "#EF4444",
    });
    expect(getScoreMeta(null)).toMatchObject({
      label: "—",
      badgeTone: "neutral",
    });
    expect(getScoreTier(52).label).toBe("Khá");
    expect(getScoreThresholdColor(52, true)).toBe(
      getScoreThresholdColor(52, false),
    );
    expect(getScoreThresholdColor(82, true)).toBe("#10B981");
  });

  it("avoids avatar collisions, deduplicates job tags, and humanizes Uploaded JD", () => {
    expect(getAvatarInitials("Ứng viên 1")).toBe("U1");
    expect(getAvatarInitials("Ứng viên 18")).toBe("U18");
    expect(getAvatarInitials("Ứng viên 1")).not.toBe(
      getAvatarInitials("Ứng viên 18"),
    );
    expect(getAvatarInitials("Nguyễn Đình Duy")).toBe("ND");

    expect(
      deduplicateJobSkills(
        ["React", "react", "Hồ Chí Minh", "Level: MID", "Dữ liệu thực", "TypeScript"],
        "Quận 1, Hồ Chí Minh",
        "mid",
      ),
    ).toEqual(["React", "TypeScript"]);

    expect(
      getSessionJobTitle({
        session_id: "s1",
        status: "completed",
        language: "vi",
        max_questions: 5,
        current_stage: "completed",
        current_question: null,
        turns: [],
        job_profile_json: { title: "Uploaded JD" },
      }),
    ).toBe("JD ứng viên tự tải lên");
  });
});
