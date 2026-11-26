import {
  getSessionCandidateName,
  getSessionJobTitle,
  type InterviewSession,
} from "@/services/interviewApi";
import { getScoreMeta, type ScoreMeta } from "@/utils/scoreMeta";
export { getScoreMeta, type ScoreMeta };

export type SessionEvaluationSummary = {
  overallScore: number;
  jobTitle: string;
  competencies: { label: string; score: number }[];
};

export type EvaluatedSessionItem = {
  session: InterviewSession;
  eval: SessionEvaluationSummary;
  candidateName: string;
  jobTitle: string;
  answeredTurns: number;
  timestamp: number;
  isCompleted: boolean;
};

export type UserScoreChartPoint = {
  sessionId: string;
  orderLabel: string;
  dateTimeLabel: string;
  shortDateLabel: string;
  jobTitle: string;
  score: number;
  isLatest: boolean;
};

export type UserScoreProgressResult = {
  points: UserScoreChartPoint[];
  averageScore: number;
  completedCount: number;
  highestScore: number;
};

export type SkillRadarPoint = {
  skill: string;
  fullLabel: string;
  score: number;
  fullMark: number;
};

export type DailyVolumePoint = {
  isoDate: string;
  label: string;
  fullDateLabel: string;
  completed: number;
  incomplete: number;
  total: number;
};

export type ScoreHistogramBin = {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  color: string;
};

export type QualityDonutSegment = {
  name: string;
  count: number;
  percentage: number;
  color: string;
};

export type QualityDonutResult = {
  totalScored: number;
  segments: QualityDonutSegment[];
};

export function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isSessionCompleted(session: InterviewSession): boolean {
  return (
    session.status === "completed" || session.current_stage === "completed"
  );
}

export function evaluateSessions(
  sessions: InterviewSession[],
  evaluator: (s: InterviewSession) => SessionEvaluationSummary,
): EvaluatedSessionItem[] {
  return sessions.map((s) => {
    const evalResult = evaluator(s);
    const answeredTurns = s.turns
      ? s.turns.filter((t) => Boolean(t.answer)).length
      : 0;
    return {
      session: s,
      eval: evalResult,
      candidateName: getSessionCandidateName(s),
      jobTitle: getSessionJobTitle(s),
      answeredTurns,
      timestamp: s.created_at ? new Date(s.created_at).getTime() : 0,
      isCompleted: isSessionCompleted(s),
    };
  });
}

export function filterSessionsByDateRange(
  sessions: InterviewSession[],
  fromDate: string,
  toDate: string,
): InterviewSession[] {
  if (!fromDate && !toDate) return sessions;
  const startMs = fromDate
    ? new Date(`${fromDate}T00:00:00`).getTime()
    : Number.NEGATIVE_INFINITY;
  const endMs = toDate
    ? new Date(`${toDate}T23:59:59.999`).getTime()
    : Number.POSITIVE_INFINITY;

  return sessions.filter((s) => {
    if (!s.created_at) return false;
    const t = new Date(s.created_at).getTime();
    return t >= startMs && t <= endMs;
  });
}

export type ScoreTierKey = "good" | "fair" | "poor";

export type ScoreTier = {
  key: ScoreTierKey;
  label: "Tốt" | "Khá" | "Cần cải thiện";
  hex: string;
  textClass: string;
  badgeTone: "success" | "warning" | "destructive";
};

/**
 * Delegates to the single canonical getScoreMeta(score) helper.
 */
export function getScoreTier(score: number): ScoreTier {
  const meta = getScoreMeta(score);
  return {
    key: (meta.key === "unrated" ? "poor" : meta.key) as ScoreTierKey,
    label: (meta.label === "—" ? "Cần cải thiện" : meta.label) as ScoreTier["label"],
    hex: meta.hex,
    textClass: meta.textClass,
    badgeTone: (meta.badgeTone === "neutral"
      ? "destructive"
      : meta.badgeTone) as ScoreTier["badgeTone"],
  };
}

/**
 * Unified threshold color for score charts (>= 80 green, 50-79 amber, < 50 red).
 */
export function getScoreThresholdColor(
  score: number,
  _isLatest = false,
): string {
  return getScoreMeta(score).hex;
}

/**
 * User Dashboard Bar Chart:
 * - Only completed sessions (status === "completed")
 * - Chronological order labeled "#1", "#2", ... (no repeated dates on X axis)
 * - Average score computed for ReferenceLine
 */
export function buildUserScoreProgressData(
  evaluated: EvaluatedSessionItem[],
  maxPoints = 10,
): UserScoreProgressResult {
  const completedSortedAsc = evaluated
    .filter((item) => item.isCompleted)
    .sort((a, b) => a.timestamp - b.timestamp);

  const sliced = completedSortedAsc.slice(-maxPoints);
  const startOrdinal = Math.max(0, completedSortedAsc.length - sliced.length);

  const points: UserScoreChartPoint[] = sliced.map((item, idx) => {
    const dt = item.session.created_at
      ? new Date(item.session.created_at)
      : null;
    const dateTimeLabel = dt
      ? dt.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Gần đây";
    const shortDateLabel = dt
      ? dt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
      : "—";

    return {
      sessionId: item.session.session_id,
      orderLabel: `#${startOrdinal + idx + 1}`,
      dateTimeLabel,
      shortDateLabel,
      jobTitle: item.jobTitle,
      score: item.eval.overallScore,
      isLatest: idx === sliced.length - 1,
    };
  });

  const allCompletedScores = completedSortedAsc.map(
    (item) => item.eval.overallScore,
  );
  const averageScore =
    allCompletedScores.length > 0
      ? Math.round(
          (allCompletedScores.reduce((a, b) => a + b, 0) /
            allCompletedScores.length) *
            10,
        ) / 10
      : 0;
  const highestScore =
    allCompletedScores.length > 0 ? Math.max(...allCompletedScores) : 0;

  return {
    points,
    averageScore,
    completedCount: completedSortedAsc.length,
    highestScore,
  };
}

const SHORT_SKILL_LABELS: Record<string, string> = {
  "Kiến thức chuyên môn": "Chuyên môn",
  "Kỹ năng giải quyết vấn đề": "Giải quyết VĐ",
  "Kinh nghiệm thực chiến": "Kinh nghiệm",
  "Kỹ năng giao tiếp": "Giao tiếp",
  "Độ phù hợp công việc": "Phù hợp JD",
};

export function buildSkillRadarData(
  competencies: { label: string; score: number }[],
): SkillRadarPoint[] {
  return competencies.slice(0, 4).map((comp) => {
    const prefix = comp.label.split("&")[0]?.trim() || comp.label;
    const shortLabel = SHORT_SKILL_LABELS[prefix] || prefix;
    return {
      skill: shortLabel,
      fullLabel: comp.label,
      score: Math.max(0, Math.min(100, Math.round(comp.score))),
      fullMark: 100,
    };
  });
}

/**
 * Admin Daily Volume Stacked Bar helper:
 * Fills every single calendar date between start and end with 0 for days without sessions.
 * Splits counts into `completed` (green) and `incomplete` (zinc grey).
 */
export function fillMissingDates(
  evaluated: EvaluatedSessionItem[],
  fromDate?: string,
  toDate?: string,
  maxDays = 30,
): DailyVolumePoint[] {
  const buckets = new Map<string, { completed: number; incomplete: number }>();

  let minTime = Number.POSITIVE_INFINITY;
  let maxTime = Number.NEGATIVE_INFINITY;

  evaluated.forEach((item) => {
    if (!item.session.created_at) return;
    const d = new Date(item.session.created_at);
    const iso = toLocalIsoDate(d);
    const dayStart = new Date(`${iso}T00:00:00`).getTime();
    if (dayStart < minTime) minTime = dayStart;
    if (dayStart > maxTime) maxTime = dayStart;

    const prev = buckets.get(iso) || { completed: 0, incomplete: 0 };
    if (item.isCompleted) prev.completed += 1;
    else prev.incomplete += 1;
    buckets.set(iso, prev);
  });

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (fromDate && toDate) {
    startDate = new Date(`${fromDate}T00:00:00`);
    endDate = new Date(`${toDate}T00:00:00`);
  } else if (fromDate) {
    startDate = new Date(`${fromDate}T00:00:00`);
    endDate = new Date();
  } else if (toDate) {
    endDate = new Date(`${toDate}T00:00:00`);
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
  } else if (Number.isFinite(minTime) && Number.isFinite(maxTime)) {
    startDate = new Date(minTime);
    endDate = new Date(maxTime);
    // Ensure at least 7 days context when all sessions happened in 1-2 days
    const spanDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86_400_000,
    );
    if (spanDays < 6) {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
    }
  }

  if (!startDate || !endDate || startDate > endDate) {
    return [];
  }

  // Cap window to latest `maxDays` days to keep chart readable
  const totalSpan = Math.round(
    (endDate.getTime() - startDate.getTime()) / 86_400_000,
  );
  if (totalSpan >= maxDays) {
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (maxDays - 1));
  }

  const result: DailyVolumePoint[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const iso = toLocalIsoDate(cursor);
    const entry = buckets.get(iso) || { completed: 0, incomplete: 0 };
    result.push({
      isoDate: iso,
      label: cursor.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      fullDateLabel: cursor.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      completed: entry.completed,
      incomplete: entry.incomplete,
      total: entry.completed + entry.incomplete,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

/**
 * Admin "Điểm AI" tab: Score distribution histogram across 5 bins aligned to getScoreMeta thresholds
 * (< 50 red, 50-79 amber, >= 80 green). Counts ONLY completed sessions to match KPI & Quality Donut.
 */
export function buildScoreHistogramData(
  evaluated: EvaluatedSessionItem[],
): ScoreHistogramBin[] {
  const scored = evaluated.filter((item) => item.isCompleted);
  const total = scored.length;

  const binDefs = [
    { range: "0–25", min: 0, max: 25, color: "#EF4444" },
    { range: "25–50", min: 25, max: 50, color: "#F87171" },
    { range: "50–65", min: 50, max: 65, color: "#F59E0B" },
    { range: "65–80", min: 65, max: 80, color: "#FBBF24" },
    { range: "80–100", min: 80, max: 100, color: "#10B981" },
  ];

  return binDefs.map((bin, idx) => {
    const count = scored.filter((item) => {
      const s = item.eval.overallScore;
      if (idx === binDefs.length - 1) return s >= bin.min && s <= bin.max;
      return s >= bin.min && s < bin.max;
    }).length;
    return {
      ...bin,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

/**
 * Admin Quality Distribution Donut Chart (3 tiers aligned 100% with getScoreMeta):
 * Counts ONLY completed sessions so `totalScored` matches the "Hoàn thành" KPI count.
 */
export function buildQualityDonutData(
  evaluated: EvaluatedSessionItem[],
): QualityDonutResult {
  const scored = evaluated.filter((item) => item.isCompleted);
  const totalScored = scored.length;

  const high = scored.filter(
    (item) => getScoreMeta(item.eval.overallScore).key === "good",
  ).length;
  const mid = scored.filter(
    (item) => getScoreMeta(item.eval.overallScore).key === "fair",
  ).length;
  const low = scored.filter(
    (item) => getScoreMeta(item.eval.overallScore).key === "poor",
  ).length;

  const pct = (n: number) =>
    totalScored > 0 ? Math.round((n / totalScored) * 100) : 0;

  return {
    totalScored,
    segments: [
      {
        name: "Phù hợp cao (≥ 80)",
        count: high,
        percentage: pct(high),
        color: getScoreMeta(85).hex,
      },
      {
        name: "Cần xem xét (50–79)",
        count: mid,
        percentage: pct(mid),
        color: getScoreMeta(65).hex,
      },
      {
        name: "Chưa phù hợp (< 50)",
        count: low,
        percentage: pct(low),
        color: getScoreMeta(30).hex,
      },
    ],
  };
}

