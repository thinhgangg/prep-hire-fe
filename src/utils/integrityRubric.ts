/**
 * Integrity Rubric Scoring Engine
 * Thực thi chính xác theo tài liệu: "10-20 - Giải pháp đo độ trung thực từ video.docx"
 *
 * 1. Mỗi câu trả lời bắt đầu với 100 điểm.
 * 2. Bước 1 (P_events):
 *    - Nhìn trái / phải / xuống: liên tục >= 2.0s -> 1.5 điểm / giây
 *    - Nhìn lên:                 liên tục >= 3.5s -> 0.5 điểm / giây
 *    - Rời khỏi khung hình:      mất mặt >= 2.0s  -> 2.5 điểm / giây
 *    - Có người thứ hai:         >= 2 mặt >= 1.5s -> trừ ngay 15 điểm + 5.0 điểm / giây
 *    (Đạt ngưỡng thì trừ toàn bộ thời lượng của lần vi phạm đó.)
 * 3. Bước 2 (P_focus — hay liếc ngắn):
 *    - Chỉ tính trên phần thời gian chưa bị phạt ở Bước 1:
 *      unpenalizedSec = max(0, totalSec - penalizedSec)
 *      straightRatio  = straightSec / unpenalizedSec
 *    - Nếu straightRatio < 0.80 -> P_focus = (0.80 - straightRatio) * 50
 * 4. Bước 3:
 *    - Điểm câu = max(0, 100 - P_events - P_focus)
 *    - Điểm cả buổi = trung bình điểm các câu
 *    - Xếp hạng:
 *      - LOW:    < 65 điểm HOẶC có người thứ hai (đạt ngưỡng >= 1.5s)
 *      - MEDIUM: 65 đến < 85 điểm (và không có người thứ hai)
 *      - HIGH:   85 đến 100 điểm (và không có người thứ hai)
 */

export type IntegrityBehaviorType =
  | "SIDE_OR_DOWN"
  | "LOOK_UP"
  | "NO_FACE"
  | "SECOND_PERSON";

export type IntegrityRank = "HIGH" | "MEDIUM" | "LOW";

export const INTEGRITY_RUBRIC = {
  BASE_SCORE: 100,
  HIGH_MIN_SCORE: 85,
  MEDIUM_MIN_SCORE: 65,
  FOCUS_THRESHOLD: 0.8,
  FOCUS_PENALTY_MULTIPLIER: 50,
  BEHAVIORS: {
    SIDE_OR_DOWN: {
      thresholdSec: 2.0,
      basePenalty: 0,
      penaltyPerSec: 1.5,
      label: "Nhìn trái / phải / xuống",
      suspicion: "Đọc AI trên màn hình phụ, xem điện thoại",
    },
    LOOK_UP: {
      thresholdSec: 3.5,
      basePenalty: 0,
      penaltyPerSec: 0.5,
      label: "Nhìn lên",
      suspicion: "Thường chỉ là đang suy nghĩ nên trừ nhẹ",
    },
    NO_FACE: {
      thresholdSec: 2.0,
      basePenalty: 0,
      penaltyPerSec: 2.5,
      label: "Rời khỏi khung hình",
      suspicion: "Bỏ đi hoặc che camera",
    },
    SECOND_PERSON: {
      thresholdSec: 1.5,
      basePenalty: 15,
      penaltyPerSec: 5.0,
      label: "Có người thứ hai",
      suspicion: "Có người nhắc bài trong khung hình",
    },
  },
} as const;

export const INTEGRITY_DISCLAIMER =
  "Điểm độ trung thực chỉ để gợi ý HR xem lại các mốc video đã gắn cờ — hệ thống không tự kết luận ứng viên gian lận.";

export type IntegrityViolationEpisode = {
  behavior: IntegrityBehaviorType;
  startSec: number;
  endSec: number;
  durationSec: number;
  timestamp: string;
  direction?: string;
  questionIndex: number;
  questionText?: string;
  stage?: string;
  activity?: string;
  snapshotUrl?: string;
};

export type PenalizedViolationDetail = IntegrityViolationEpisode & {
  penalty: number;
};

export type QuestionIntegrityInput = {
  questionIndex: number;
  questionText?: string;
  totalDurationSec: number;
  straightDurationSec: number;
  episodes: IntegrityViolationEpisode[];
};

export type QuestionIntegrityScore = {
  questionIndex: number;
  questionText?: string;
  totalDurationSec: number;
  straightDurationSec: number;
  penalizedDurationSec: number;
  unpenalizedDurationSec: number;
  straightRatioOnUnpenalized: number;
  pEvents: number;
  pFocus: number;
  score: number;
  rank: IntegrityRank;
  hasSecondPerson: boolean;
  violations: PenalizedViolationDetail[];
};

export type SessionIntegritySummary = {
  rubricVersion: string;
  overallScore: number;
  rank: IntegrityRank;
  hasSecondPerson: boolean;
  totalQuestionsScored: number;
  totalViolations: number;
  totalPEvents: number;
  totalPFocus: number;
  questions: QuestionIntegrityScore[];
  disclaimer: string;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function calculateEpisodePenalty(
  behavior: IntegrityBehaviorType,
  durationSec: number,
): number {
  const rule = INTEGRITY_RUBRIC.BEHAVIORS[behavior];
  if (!rule || durationSec < rule.thresholdSec) return 0;
  return round1(rule.basePenalty + rule.penaltyPerSec * durationSec);
}

export function classifyIntegrityRank(
  score: number,
  hasSecondPerson: boolean,
): IntegrityRank {
  if (hasSecondPerson || score < INTEGRITY_RUBRIC.MEDIUM_MIN_SCORE) {
    return "LOW";
  }
  if (score >= INTEGRITY_RUBRIC.HIGH_MIN_SCORE) {
    return "HIGH";
  }
  return "MEDIUM";
}

export function getIntegrityRankMeta(rank: IntegrityRank): {
  label: string;
  shortLabel: string;
  guidance: string;
} {
  if (rank === "HIGH") {
    return {
      label: "Cao (HIGH)",
      shortLabel: "HIGH",
      guidance: "Tốt, duy trì tập trung ổn định — không cần xem lại.",
    };
  }
  if (rank === "MEDIUM") {
    return {
      label: "Trung bình (MEDIUM)",
      shortLabel: "MEDIUM",
      guidance: "Có dấu hiệu xao nhãng — HR nên lưu ý thêm khi đánh giá.",
    };
  }
  return {
    label: "Thấp (LOW)",
    shortLabel: "LOW",
    guidance: "HR nên xem lại video tại các mốc thời gian đã gắn cờ.",
  };
}

export function scoreQuestionIntegrity(
  input: QuestionIntegrityInput,
): QuestionIntegrityScore {
  const totalDurationSec = Math.max(0, input.totalDurationSec);
  const straightDurationSec = Math.max(
    0,
    Math.min(input.straightDurationSec, totalDurationSec),
  );

  // Step 1: P_events — sum penalties for continuous violations >= threshold
  let rawPEvents = 0;
  let penalizedDurationSec = 0;
  let hasSecondPerson = false;
  const violations: PenalizedViolationDetail[] = [];

  for (const ep of input.episodes) {
    const rule = INTEGRITY_RUBRIC.BEHAVIORS[ep.behavior];
    if (!rule) continue;
    if (ep.durationSec >= rule.thresholdSec) {
      const penalty = rule.basePenalty + rule.penaltyPerSec * ep.durationSec;
      rawPEvents += penalty;
      penalizedDurationSec += ep.durationSec;
      if (ep.behavior === "SECOND_PERSON") {
        hasSecondPerson = true;
      }
      violations.push({
        ...ep,
        durationSec: round1(ep.durationSec),
        penalty: round1(penalty),
      });
    }
  }

  // Clamp penalized duration so unpenalizedDurationSec never goes negative
  const effectivePenalizedSec = Math.min(totalDurationSec, penalizedDurationSec);
  const unpenalizedDurationSec = Math.max(
    0,
    totalDurationSec - effectivePenalizedSec,
  );

  // Step 2: P_focus — short glancing penalty on UNPENALIZED time only (avoids double penalty)
  // Straight time belongs exclusively to unpenalized time, clamp safely to [0, 1]
  const straightRatio =
    unpenalizedDurationSec > 0
      ? Math.min(1, Math.max(0, straightDurationSec / unpenalizedDurationSec))
      : 1;

  const rawPFocus =
    unpenalizedDurationSec > 0 && straightRatio < INTEGRITY_RUBRIC.FOCUS_THRESHOLD
      ? (INTEGRITY_RUBRIC.FOCUS_THRESHOLD - straightRatio) *
        INTEGRITY_RUBRIC.FOCUS_PENALTY_MULTIPLIER
      : 0;

  // Step 3: Question score = max(0, 100 - P_events - P_focus)
  const rawScore = Math.max(
    0,
    INTEGRITY_RUBRIC.BASE_SCORE - rawPEvents - rawPFocus,
  );
  const score = round1(rawScore);
  const rank = classifyIntegrityRank(score, hasSecondPerson);

  return {
    questionIndex: input.questionIndex,
    questionText: input.questionText,
    totalDurationSec: round1(totalDurationSec),
    straightDurationSec: round1(straightDurationSec),
    penalizedDurationSec: round1(effectivePenalizedSec),
    unpenalizedDurationSec: round1(unpenalizedDurationSec),
    straightRatioOnUnpenalized: round3(straightRatio),
    pEvents: round1(rawPEvents),
    pFocus: round1(rawPFocus),
    score,
    rank,
    hasSecondPerson,
    violations,
  };
}

export function scoreSessionIntegrity(
  questionInputs: QuestionIntegrityInput[],
): SessionIntegritySummary {
  const validInputs = questionInputs
    .filter((q) => q.totalDurationSec > 0)
    .sort((a, b) => a.questionIndex - b.questionIndex);

  if (validInputs.length === 0) {
    return {
      rubricVersion: "video-integrity-rubric-v1",
      overallScore: 0,
      rank: "LOW",
      hasSecondPerson: false,
      totalQuestionsScored: 0,
      totalViolations: 0,
      totalPEvents: 0,
      totalPFocus: 0,
      questions: [],
      disclaimer: INTEGRITY_DISCLAIMER,
    };
  }

  const questions = validInputs.map(scoreQuestionIntegrity);
  const avgScore =
    questions.reduce((acc, q) => acc + q.score, 0) / questions.length;
  const overallScore = round1(avgScore);
  const hasSecondPerson = questions.some((q) => q.hasSecondPerson);
  const rank = classifyIntegrityRank(overallScore, hasSecondPerson);

  return {
    rubricVersion: "video-integrity-rubric-v1",
    overallScore,
    rank,
    hasSecondPerson,
    totalQuestionsScored: questions.length,
    totalViolations: questions.reduce((acc, q) => acc + q.violations.length, 0),
    totalPEvents: round1(questions.reduce((acc, q) => acc + q.pEvents, 0)),
    totalPFocus: round1(questions.reduce((acc, q) => acc + q.pFocus, 0)),
    questions,
    disclaimer: INTEGRITY_DISCLAIMER,
  };
}

