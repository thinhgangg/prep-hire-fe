import {
  getSessionCandidateName,
  getSessionJobTitle,
  loadCvAnalysis,
  type InterviewSession,
} from "../services/interviewApi";

const NON_ANSWER_PATTERNS: RegExp[] = [
  /^(không|khong|ko|k|nope|no|none|pass|skip|bỏ qua|bo qua|next|tiếp|tiep)[\.\!\?\s]*$/i,
  /^(tôi|em|mình|toi|minh)?\s*(không|khong|ko|k|chưa|chua)\s*(biết|biet|rõ|ro|nhớ|nho|hiểu|hieu|có|co|làm|lam|trả lời|tra loi|biết gì|biet gi)(\s*(ạ|a|đâu|dau|nữa|nua|cả|ca|hết|het|về|ve|câu này|cau nay|câu hỏi này|cau hoi nay|phần này|phan nay|vấn đề này|van de nay))*[\.\!\?\s]*$/i,
  /^(chịu|chiu|chịu thôi|chiu thoi|quên rồi|quen roi|em chịu|em quên|em không biết|tôi không biết|không biết|khong biet|ko biết|ko biet|idk|i don't know|i dont know|no idea|not sure|pass this|skip this)[\.\!\?\s]*$/i,
  /^(tôi|em|mình)?\s*(chưa có câu trả lời|chua co cau tra loi|xin phép bỏ qua|xin phep bo qua|bỏ qua câu này|bo qua cau nay|qua câu tiếp theo|qua cau tiep theo|cho qua câu này)[\.\!\?\s]*$/i,
];

const REFUSAL_KEYWORDS = [
  "không biết",
  "khong biet",
  "ko biết",
  "ko biet",
  "k biết",
  "chưa biết",
  "chua biet",
  "chưa rõ",
  "không rõ",
  "em chịu",
  "tôi chịu",
  "bỏ qua câu",
  "xin bỏ qua",
  "xin phép bỏ qua",
  "chưa có câu trả lời",
  "i don't know",
  "i dont know",
  "no idea",
  "don't know",
];

export function isNonAnswer(text: string | null | undefined): boolean {
  if (!text) return true;
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length === 0) return true;
  if (cleaned.length < 3 || /^[\.\s\?\-,\!_]+$/.test(cleaned)) return true;
  for (const pat of NON_ANSWER_PATTERNS) {
    if (pat.test(cleaned)) return true;
  }
  const words = cleaned.split(/\s+/);
  if (words.length <= 18) {
    const hasRefusal = REFUSAL_KEYWORDS.some((k) => cleaned.includes(k));
    if (hasRefusal) {
      const hasContrast = [
        "nhưng",
        "tuy nhiên",
        "song",
        "theo em",
        "em nghĩ",
        "thực ra là",
        "thực tế là",
      ].some((c) => cleaned.includes(c));
      if (!hasContrast) return true;
    }
  }
  return false;
}

export type CompetencyResult = {
  key: string;
  label: string;
  score: number;
  level: string;
  desc: string;
};

export type OverallAiEvaluation = {
  candidateName: string;
  jobTitle: string;
  answeredCount: number;
  overallScore: number;
  confidence: number;
  levelText: string;
  recommendation: string;
  competencies: CompetencyResult[];
  radarPoints: number[];
  strengths: string[];
  improvements: string[];
};

const COMPETENCY_SIGNALS: Record<string, Record<string, number>> = {
  technical_knowledge: {
    technical_correctness: 0.4,
    expected_signal_coverage: 0.25,
    reasoning_quality: 0.2,
    answer_relevance: 0.1,
    consistency: 0.05,
  },
  problem_solving: {
    reasoning_quality: 0.35,
    technical_correctness: 0.25,
    expected_signal_coverage: 0.2,
    evidence_quality: 0.1,
    consistency: 0.1,
  },
  experience_evidence: {
    evidence_quality: 0.4,
    expected_signal_coverage: 0.25,
    answer_relevance: 0.15,
    consistency: 0.15,
    clarity_conciseness: 0.05,
  },
  communication: {
    clarity_conciseness: 0.45,
    answer_relevance: 0.3,
    consistency: 0.15,
    expected_signal_coverage: 0.1,
  },
  role_relevance: {
    expected_signal_coverage: 0.4,
    answer_relevance: 0.3,
    evidence_quality: 0.15,
    consistency: 0.15,
  },
};

const OVERALL_WEIGHTS: Record<string, number> = {
  technical_knowledge: 0.25,
  problem_solving: 0.25,
  experience_evidence: 0.2,
  communication: 0.15,
  role_relevance: 0.15,
};

const IMPROVEMENT_ADVICE_BY_KEY: Record<string, string> = {
  technical_knowledge:
    "Củng cố kiến thức nền tảng chuyên sâu và giải thích rõ cơ chế hoạt động bên dưới công cụ/framework sử dụng.",
  problem_solving:
    "Trình bày rõ ràng hơn cách phân tích trade-off, xử lý edge cases và từng bước tiếp cận bài toán.",
  experience_evidence:
    "Bổ sung ví dụ triển khai dự án thực tế kèm chỉ số định lượng (metrics, hiệu năng, kết quả đạt được).",
  communication:
    "Cấu trúc câu trả lời gọn gàng hơn theo mô hình STAR (Tình huống – Nhiệm vụ – Hành động – Kết quả).",
  role_relevance:
    "Liên kết chặt chẽ hơn giữa kinh nghiệm cá nhân trong CV với các yêu cầu trọng tâm của JD.",
};

const STRENGTH_SUMMARY_BY_KEY: Record<string, string> = {
  technical_knowledge: "Nền tảng kiến thức chuyên môn và kỹ thuật vững vàng",
  problem_solving: "Tư duy phân tích và giải quyết vấn đề mạch lạc",
  experience_evidence: "Dẫn chứng kinh nghiệm dự án thực tế thuyết phục",
  communication: "Khả năng diễn đạt rõ ràng, có cấu trúc và đúng trọng tâm",
  role_relevance: "Mức độ phù hợp cao và nhất quán với yêu cầu vị trí (JD)",
};

export function computeAiEvaluation(
  session: InterviewSession | null,
  history: any[] = [],
): OverallAiEvaluation {
  const totalExpected =
    session?.max_questions ||
    Math.max(session?.turns?.length || 0, history.length || 0, 5);

  const sessionTurns = (session?.turns || []).map((t) => ({
    turnIndex: t.turn_index,
    stage: t.stage,
    criterion: t.criterion,
    question: t.question,
    answer: t.answer || "",
    scores: (t.answer_evidence?.scores ||
      t.answer_evidence?.applicable_scores ||
      {}) as Record<string, number>,
  }));

  const rawTurns = sessionTurns.length > 0 ? sessionTurns : history;

  let validAnsweredCount = 0;
  let nonAnswerCount = 0;
  let unansweredCount = 0;

  const allProcessedTurns: {
    turnIndex: number;
    scores: Record<string, number>;
    isNonAnswer: boolean;
  }[] = [];

  const zeroScores = {
    answer_relevance: 1.0,
    technical_correctness: 1.0,
    expected_signal_coverage: 1.0,
    reasoning_quality: 1.0,
    evidence_quality: 1.0,
    clarity_conciseness: 1.0,
    consistency: 1.0,
  };

  rawTurns.forEach((t, idx) => {
    const ans = (t.answer || "").trim();
    const isRefusal = isNonAnswer(ans);
    if (!ans) {
      unansweredCount++;
      allProcessedTurns.push({
        turnIndex: t.turnIndex ?? idx,
        scores: zeroScores,
        isNonAnswer: true,
      });
    } else if (isRefusal) {
      nonAnswerCount++;
      allProcessedTurns.push({
        turnIndex: t.turnIndex ?? idx,
        scores: zeroScores,
        isNonAnswer: true,
      });
    } else {
      validAnsweredCount++;
      const hasModelScores = t.scores && Object.keys(t.scores).length > 0;
      allProcessedTurns.push({
        turnIndex: t.turnIndex ?? idx,
        scores: hasModelScores
          ? t.scores
          : {
              answer_relevance: 3.0,
              technical_correctness: 3.0,
              expected_signal_coverage: 3.0,
              reasoning_quality: 3.0,
              evidence_quality: 3.0,
              clarity_conciseness: 3.0,
              consistency: 3.0,
            },
        isNonAnswer: false,
      });
    }
  });

  const missingTurns = Math.max(0, totalExpected - allProcessedTurns.length);
  unansweredCount += missingTurns;
  for (let m = 0; m < missingTurns; m++) {
    allProcessedTurns.push({
      turnIndex: allProcessedTurns.length + m,
      scores: zeroScores,
      isNonAnswer: true,
    });
  }

  let candidateName = session ? getSessionCandidateName(session) : "";
  let jobTitle = session ? getSessionJobTitle(session) : "";

  if (!session) {
    try {
      candidateName = sessionStorage.getItem("selected_cv_name") || "";
      jobTitle = sessionStorage.getItem("selected_job_title") || "";
      const analysis = loadCvAnalysis();
      if (!jobTitle && analysis?.job_context?.title) {
        jobTitle = analysis.job_context.title;
      }
      if (!candidateName && analysis?.extracted_profile) {
        candidateName = "Ứng viên";
      }
    } catch {}
  }

  if (!candidateName) candidateName = "Ứng viên";
  if (!jobTitle) jobTitle = "Vị trí phỏng vấn";

  const criterionSum: Record<string, number> = {};
  const criterionCount: Record<string, number> = {};

  allProcessedTurns.forEach((t) => {
    Object.entries(t.scores).forEach(([k, v]) => {
      const val = Number(v);
      if (Number.isFinite(val) && val > 0) {
        criterionSum[k] = (criterionSum[k] || 0) + val;
        criterionCount[k] = (criterionCount[k] || 0) + 1;
      }
    });
  });

  const criterionAvg: Record<string, number> = {};
  Object.keys(criterionSum).forEach((k) => {
    criterionAvg[k] = criterionSum[k] / Math.max(1, criterionCount[k]);
  });

  const hasValidAnswers = validAnsweredCount > 0;
  const compValues: Record<string, number> = {};
  Object.entries(COMPETENCY_SIGNALS).forEach(([compKey, weights]) => {
    let wSum = 0;
    let wTotal = 0;
    Object.entries(weights).forEach(([signalKey, weight]) => {
      const val = criterionAvg[signalKey] ?? (hasValidAnswers ? 3.0 : 0.0);
      wSum += val * weight;
      wTotal += weight;
    });
    compValues[compKey] =
      wTotal > 0 ? wSum / wTotal : hasValidAnswers ? 3.0 : 0.0;
  });

  const toScore = (val: number) =>
    hasValidAnswers ? Math.min(100, Math.max(10, Math.round((val / 5.0) * 100))) : 0;

  const competencies: CompetencyResult[] = [
    {
      key: "technical_knowledge",
      label: "Kiến thức chuyên môn & Kỹ thuật",
      score: toScore(compValues.technical_knowledge),
      level: hasValidAnswers
        ? compValues.technical_knowledge >= 4.0
          ? "Thành thạo"
          : compValues.technical_knowledge >= 2.5
            ? "Đạt yêu cầu"
            : "Chưa đạt"
        : "Không đạt (0đ)",
      desc: "Độ chính xác về khái niệm kỹ thuật và kiến trúc hệ thống.",
    },
    {
      key: "problem_solving",
      label: "Kỹ năng giải quyết vấn đề & Tư duy",
      score: toScore(compValues.problem_solving),
      level: hasValidAnswers
        ? compValues.problem_solving >= 4.0
          ? "Tư duy logic cao"
          : compValues.problem_solving >= 2.5
            ? "Khá"
            : "Chưa đạt"
        : "Không đạt (0đ)",
      desc: "Chất lượng lập luận, phân tích trade-off và tối ưu giải pháp.",
    },
    {
      key: "experience_evidence",
      label: "Kinh nghiệm thực chiến & Dẫn chứng",
      score: toScore(compValues.experience_evidence),
      level: hasValidAnswers
        ? compValues.experience_evidence >= 4.0
          ? "Thực chứng mạnh mẽ"
          : compValues.experience_evidence >= 2.5
            ? "Cơ bản"
            : "Thiếu dẫn chứng"
        : "Không đạt (0đ)",
      desc: "Dẫn chứng cụ thể từ các dự án thực tế và số liệu triển khai.",
    },
    {
      key: "communication",
      label: "Kỹ năng giao tiếp & Trình bày",
      score: toScore(compValues.communication),
      level: hasValidAnswers
        ? compValues.communication >= 4.0
          ? "Mạch lạc, súc tích"
          : compValues.communication >= 2.5
            ? "Đạt yêu cầu"
            : "Cần cải thiện"
        : "Không đạt (0đ)",
      desc: "Cấu trúc câu trả lời rõ ràng, truyền đạt tự tin, có trọng tâm.",
    },
    {
      key: "role_relevance",
      label: "Độ phù hợp công việc & Nhất quán",
      score: toScore(compValues.role_relevance),
      level: hasValidAnswers
        ? compValues.role_relevance >= 4.0
          ? "Phù hợp cao với JD"
          : compValues.role_relevance >= 2.5
            ? "Phù hợp"
            : "Chưa phù hợp"
        : "Không đạt (0đ)",
      desc: "Mức độ bám sát yêu cầu công việc và tính trung thực so với CV.",
    },
  ];

  let overallScore = 0;
  if (hasValidAnswers) {
    let overallSum = 0;
    let overallWeight = 0;
    competencies.forEach((c) => {
      const w = OVERALL_WEIGHTS[c.key] || 0.2;
      overallSum += c.score * w;
      overallWeight += w;
    });
    const completionRate = validAnsweredCount / Math.max(1, totalExpected);
    overallScore = Math.round((overallSum / overallWeight) * completionRate);
  }

  const levelText =
    overallScore >= 80
      ? "Ứng viên phù hợp cao"
      : overallScore >= 65
        ? "Ứng viên tiềm năng"
        : overallScore >= 45
          ? "Cần cải thiện thêm"
          : overallScore > 0
            ? "Chưa đạt yêu cầu"
            : "Không đạt (0 điểm - Bỏ qua toàn bộ câu hỏi)";

  const totalPenalized = nonAnswerCount + unansweredCount;
  const recommendation = !hasValidAnswers
    ? "KHÔNG ĐẠT (0 ĐIỂM) - Ứng viên đã bỏ qua hoặc không trả lời bất kỳ câu hỏi nào trong suốt phiên phỏng vấn."
    : totalPenalized > 0 && overallScore < 65
      ? `Điểm tổng kết bị trừ đáng kể do có ${totalPenalized}/${totalExpected} câu hỏi không trả lời hoặc bỏ qua.`
      : overallScore >= 75
        ? "Đạt tiêu chuẩn xuất sắc - Đề xuất tiến hành phỏng vấn trực tiếp với Tech Lead / Hiring Manager."
        : overallScore >= 60
          ? "Đạt yêu cầu cơ bản - Cần đào sâu thêm về một số kỹ năng thực tế chuyên sâu."
          : "Chưa đạt tiêu chuẩn yêu cầu - Cần trau dồi thêm kiến thức nền tảng và kinh nghiệm thực chiến.";

  // Dynamic strengths derived from top-scoring competencies
  const sortedDesc = [...competencies].sort((a, b) => b.score - a.score);
  const strengths = hasValidAnswers
    ? sortedDesc
        .filter((c) => c.score >= 55)
        .slice(0, 3)
        .map((c) => `${STRENGTH_SUMMARY_BY_KEY[c.key] || c.label} (${c.score}/100).`)
    : [
        "Chưa ghi nhận điểm mạnh nổi bật do chưa có câu trả lời hợp lệ trong phiên phỏng vấn.",
      ];

  if (hasValidAnswers && strengths.length === 0) {
    strengths.push(
      `Đã hoàn thành ${validAnsweredCount}/${totalExpected} câu hỏi; cần nâng cao thêm chiều sâu ở tất cả nhóm năng lực.`,
    );
  }

  // Dynamic improvements derived from lowest-scoring competencies (no static hardcoded bullets)
  const improvements: string[] = [];
  if (!hasValidAnswers) {
    improvements.push(
      "Ứng viên cần trả lời đầy đủ các câu hỏi phỏng vấn để hệ thống AI có đủ dữ liệu đánh giá năng lực thực tế.",
    );
  } else {
    if (totalPenalized > 0) {
      improvements.push(
        `Điểm tổng kết bị ảnh hưởng do còn ${totalPenalized}/${totalExpected} câu hỏi chưa trả lời hoặc bỏ qua (hoàn thành ${Math.round((validAnsweredCount / totalExpected) * 100)}%).`,
      );
    }
    const sortedAsc = [...competencies].sort((a, b) => a.score - b.score);
    sortedAsc
      .filter((c) => c.score < 85)
      .slice(0, 2)
      .forEach((c) => {
        const advice = IMPROVEMENT_ADVICE_BY_KEY[c.key];
        if (advice) {
          improvements.push(`${c.label} (${c.score}/100): ${advice}`);
        }
      });
    if (improvements.length === 0) {
      improvements.push(
        "Duy trì phong độ tốt và tiếp tục rèn luyện các bài toán quy mô hệ thống lớn (System Design) ở vòng tiếp theo.",
      );
    }
  }

  const confidence = hasValidAnswers
    ? Math.min(98, Math.round(70 + (validAnsweredCount / totalExpected) * 25))
    : 0;

  return {
    candidateName,
    jobTitle,
    answeredCount: validAnsweredCount,
    overallScore,
    confidence,
    levelText,
    recommendation,
    competencies,
    radarPoints: competencies.map((c) => c.score),
    strengths,
    improvements,
  };
}

