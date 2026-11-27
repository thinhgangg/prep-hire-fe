import {
  EXPORTED_COMPETENCY_SIGNALS,
  EXPORTED_OVERALL_WEIGHTS,
  applySubstantiveEvidenceCalibration,
  isNonAnswer,
} from "./aiEvaluation";

export type EvidenceFinding = {
  kind: "positive" | "limitation" | "note";
  quote?: string;
  criterionTag: string;
  explanation: string;
};

export type SignalCheckItem = {
  signal: string;
  status: "matched" | "partial" | "missing";
  statusLabel: string;
  matchedDetail: string;
};

export type MicroCriterionDetail = {
  key: string;
  label: string;
  score5: number;
  score100: number;
  weightPct: number;
  levelLabel: string;
  reason: string;
};

export type TurnEvaluationInput = {
  turnIndex: number; // 1-based display index
  stage?: string | null;
  criterion?: string | null;
  question: string;
  answer: string | null;
  expectedSignal?: string | null;
  requiredSignals?: string[];
  bonusSignals?: string[];
  rawScores?: Record<string, number> | null;
  applicableCriteria?: string[] | null;
  isNonAnswerFlag?: boolean;
};

export type TurnEvaluationReport = {
  turnNumber: number;
  stageCode: string;
  stageLabel: string;
  targetCompetencyKey: string;
  targetCompetencyLabel: string;
  targetCompetencyWeightPct: number;
  wordCount: number;
  isSkippedOrRefused: boolean;
  hasMemoryEvasion: boolean;
  turnScore5: number;
  turnScore100: number;
  verdictLabel: string;
  verdictTone: "emerald" | "sky" | "amber" | "red";
  verdictSummary: string;
  positiveEvidences: EvidenceFinding[];
  limitationEvidences: EvidenceFinding[];
  expectedSignalText: string | null;
  signalChecklist: SignalCheckItem[];
  criteriaBreakdown: MicroCriterionDetail[];
  contributionSummary: string;
};

const STAGE_LABELS: Record<string, string> = {
  introduction: "Mở đầu & Giao tiếp",
  cv_evidence: "Kiểm chứng hồ sơ CV",
  technical: "Chuyên môn kỹ thuật",
  problem_solving: "Tình huống & Giải quyết vấn đề",
  behavioral: "Hành vi & Thích ứng",
  closing: "Tổng kết & Mức độ sẵn sàng",
  follow_up: "Đào sâu bằng chứng",
};

const COMPETENCY_META: Record<
  string,
  { label: string; mappedKey: string; weightPct: number }
> = {
  technical_knowledge: {
    label: "Kiến thức chuyên môn & Kỹ thuật",
    mappedKey: "technical_knowledge",
    weightPct: Math.round((EXPORTED_OVERALL_WEIGHTS.technical_knowledge || 0.25) * 100),
  },
  problem_solving: {
    label: "Giải quyết vấn đề & Tư duy",
    mappedKey: "problem_solving",
    weightPct: Math.round((EXPORTED_OVERALL_WEIGHTS.problem_solving || 0.25) * 100),
  },
  experience_evidence: {
    label: "Kinh nghiệm thực chiến & Dẫn chứng",
    mappedKey: "experience_evidence",
    weightPct: Math.round((EXPORTED_OVERALL_WEIGHTS.experience_evidence || 0.2) * 100),
  },
  communication: {
    label: "Kỹ năng giao tiếp & Trình bày",
    mappedKey: "communication",
    weightPct: Math.round((EXPORTED_OVERALL_WEIGHTS.communication || 0.15) * 100),
  },
  role_relevance: {
    label: "Độ phù hợp công việc (JD)",
    mappedKey: "role_relevance",
    weightPct: Math.round((EXPORTED_OVERALL_WEIGHTS.role_relevance || 0.15) * 100),
  },
  learning_adaptability: {
    label: "Khả năng học hỏi & Thích ứng",
    mappedKey: "problem_solving",
    weightPct: 15,
  },
  overall_readiness: {
    label: "Độ phù hợp & Sẵn sàng nhận việc",
    mappedKey: "role_relevance",
    weightPct: Math.round((EXPORTED_OVERALL_WEIGHTS.role_relevance || 0.15) * 100),
  },
};

const MICRO_CRITERIA_META: Record<string, { label: string; order: number }> = {
  answer_relevance: { label: "Độ liên quan câu hỏi", order: 1 },
  technical_correctness: { label: "Độ chính xác kỹ thuật", order: 2 },
  expected_signal_coverage: { label: "Bao phủ tín hiệu kỳ vọng", order: 3 },
  reasoning_quality: { label: "Tư duy & Lập luận", order: 4 },
  evidence_quality: { label: "Bằng chứng thực tiễn", order: 5 },
  clarity_conciseness: { label: "Mạch lạc & Súc tích", order: 6 },
  consistency: { label: "Tính nhất quán hồ sơ", order: 7 },
};

const DEFAULT_CRITERIA_ORDER = Object.keys(MICRO_CRITERIA_META);

const ASR_PHONETIC_TECH_ALIASES: { pattern: RegExp; canonical: string }[] = [
  { pattern: /\b(guest\s*post\s*boot\s*delete|get\s*post\s*put\s*delete)\b/i, canonical: "GET / POST / PUT / DELETE" },
  { pattern: /\b(crod|crud)\b/i, canonical: "CRUD" },
  { pattern: /\b(restful|rest\s*api|api)\b/i, canonical: "RESTful API" },
  { pattern: /\b(database|db|cơ sở dữ liệu|postgresql|mysql|mongodb|supabase)\b/i, canonical: "Database" },
  { pattern: /\b(react\s*native|flutter|swift|kotlin|ios|android|di động|mobile)\b/i, canonical: "Mobile (iOS/Android)" },
  { pattern: /\b(react|component|zustand|redux|context\s*api|state|trạng thái)\b/i, canonical: "Component / State" },
  { pattern: /\b(web|frontend|backend|giao diện|trao diện|màn hình|field)\b/i, canonical: "Web UI & Data Flow" },
  { pattern: /\b(test|unit\s*test|kiểm thử|framework|docker|redis|jwt)\b/i, canonical: "Framework & Testing" },
];

function inferCompetencyFromStage(stage?: string | null, rawCriterion?: string | null): string {
  const c = (rawCriterion || "").trim().toLowerCase();
  if (c && COMPETENCY_META[c]) return c;
  const s = (stage || "").trim().toLowerCase();
  if (s === "introduction") return "communication";
  if (s === "cv_evidence") return "experience_evidence";
  if (s === "technical") return "technical_knowledge";
  if (s === "problem_solving") return "problem_solving";
  if (s === "behavioral") return "learning_adaptability";
  if (s === "closing") return "overall_readiness";
  return "technical_knowledge";
}

function splitIntoClauses(text: string): string[] {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim()
    // Split on punctuation OR spoken Vietnamese discourse transitions when ASR omits periods
    .replace(
      /\s+(?=(Kết quả là|Tuy nhiên|Bên cạnh đó|Ngoài ra|Ví dụ như|Cụ thể là|Trong quá trình làm việc|Sau đó|Nhờ vậy))/g,
      ". ",
    );
  return normalized
    .split(/(?<=[\.\!\?\;])\s+/)
    .map((s) => s.replace(/^[\"\'\s]+|[\"\'\s]+$/g, "").trim())
    .filter((s) => s.length >= 8);
}

function truncateQuote(clause: string, maxLen = 155): string {
  const clean = clause.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen).trim()}…`;
}

function normalizeViTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function checkSignalCoverage(
  signalText: string,
  answerText: string,
  hasEvasion: boolean,
): SignalCheckItem {
  const ansLower = answerText.toLowerCase();
  const sigLower = signalText.toLowerCase();

  if (!answerText.trim() || hasEvasion) {
    // Even with evasion, check if they explicitly acknowledged a gap when required
    if (
      (sigLower.includes("thừa nhận") || sigLower.includes("khoảng cách")) &&
      /(tuy nhiên|chưa|chủ yếu|web)/i.test(ansLower) &&
      !/(không nhớ)/i.test(ansLower)
    ) {
      return {
        signal: signalText,
        status: "matched",
        statusLabel: "Đã thể hiện",
        matchedDetail: "Ứng viên đã thẳng thắn nhìn nhận khoảng cách kinh nghiệm hiện tại.",
      };
    }
    return {
      signal: signalText,
      status: "missing",
      statusLabel: "Chưa nêu rõ",
      matchedDetail: hasEvasion
        ? "Ứng viên cho biết không còn nhớ chi tiết nên chưa cung cấp được tín hiệu này."
        : "Chưa có thông tin tương ứng trong câu trả lời.",
    };
  }

  // Semantic checks for common interview signal archetypes
  if (sigLower.includes("không chuyên") || sigLower.includes("điều chỉnh ngôn ngữ") || sigLower.includes("analogies") || sigLower.includes("diagram")) {
    const hasNonTechExplanation =
      /(khách hàng|đồng nghiệp|không chuyên|dễ hiểu|ví dụ đời thường|hình ảnh|sơ đồ|diagram|minh họa|비유|so sánh)/i.test(
        ansLower,
      );
    if (hasNonTechExplanation) {
      return {
        signal: signalText,
        status: "matched",
        statusLabel: "Đã thể hiện",
        matchedDetail: "Có mô tả cách diễn giải trực quan cho đối tượng không chuyên.",
      };
    }
    return {
      signal: signalText,
      status: "missing",
      statusLabel: "Chưa nêu rõ",
      matchedDetail:
        "Ứng viên mới mô tả thao tác kỹ thuật (CRUD/database), chưa nêu cách chuyển đổi ngôn ngữ dễ hiểu hay dùng sơ đồ/ví dụ cho người không chuyên.",
    };
  }

  if (sigLower.includes("thừa nhận khoảng cách") || sigLower.includes("nhận thức")) {
    if (/(tuy nhiên|tại trường|về web| tìm hiểu|bổ sung|bù đắp)/i.test(ansLower)) {
      return {
        signal: signalText,
        status: "matched",
        statusLabel: "Đã thể hiện",
        matchedDetail: "Thừa nhận nền tảng hiện tại thiên về Web và thể hiện thái độ cầu thị với mảng Mobile.",
      };
    }
  }

  if (sigLower.includes("thời gian") || sigLower.includes("3 tháng") || sigLower.includes("lộ trình")) {
    if (/(\d+\s*(tuần|tháng|ngày)|giai đoạn|tháng đầu|tuần đầu)/i.test(ansLower)) {
      return {
        signal: signalText,
        status: "matched",
        statusLabel: "Đã thể hiện",
        matchedDetail: "Có đề cập mốc thời gian thích ứng cụ thể.",
      };
    }
    return {
      signal: signalText,
      status: "missing",
      statusLabel: "Chưa nêu rõ",
      matchedDetail: "Chưa chia mốc thời gian cụ thể (ví dụ lộ trình tuần/tháng trong 3 tháng đầu).",
    };
  }

  if (sigLower.includes("kế hoạch học tập") || sigLower.includes("tài nguyên")) {
    if (/(tìm hiểu|bổ sung|học|đọc|test|tài liệu|khóa học|dự án)/i.test(ansLower)) {
      const hasSpecificTool = /(react native|flutter|swift|kotlin|documentation|udemy|coursera)/i.test(ansLower);
      return {
        signal: signalText,
        status: hasSpecificTool ? "matched" : "partial",
        statusLabel: hasSpecificTool ? "Đã thể hiện" : "Đề cập một phần",
        matchedDetail: hasSpecificTool
          ? "Nêu rõ công nghệ và phương pháp học tập bù đắp kỹ năng."
          : "Có nêu hướng đọc code/test của công ty để học hỏi nhưng chưa chỉ rõ tài liệu hay dự án luyện tập cá nhân.",
      };
    }
  }

  if (sigLower.includes("kết quả") || sigLower.includes("phản hồi")) {
    if (/(kết quả là|giúp|đạt được|hiển thị|biển thị|cập nhật|thành công|%|\d+)/i.test(ansLower)) {
      const hasHumanOutcome = /(hiểu rõ|đồng ý|khách hàng|đồng nghiệp|nhanh hơn|%)/i.test(ansLower);
      return {
        signal: signalText,
        status: hasHumanOutcome ? "matched" : "partial",
        statusLabel: hasHumanOutcome ? "Đã thể hiện" : "Đề cập một phần",
        matchedDetail: hasHumanOutcome
          ? "Nêu rõ kết quả tác động tích cực sau khi thực hiện."
          : "Đã nêu kết quả vận hành hệ thống (cập nhật & hiển thị dữ liệu), nhưng thiếu phản hồi thực tế từ phía đồng nghiệp/khách hàng.",
      };
    }
  }

  if (sigLower.includes("câu chuyện thực tế") || sigLower.includes("ví dụ cụ thể") || sigLower.includes("dự án thực tế")) {
    if (/(trong dự án|quá trình thực hiện dự án|tại trường|khi làm|em sử dụng|tôi đã)/i.test(ansLower)) {
      const hasProjectNameOrMetric = /(nextstep|chatify|\d+|api|crud|crod|postgresql|redis|react)/i.test(ansLower);
      return {
        signal: signalText,
        status: hasProjectNameOrMetric ? "partial" : "partial",
        statusLabel: "Đề cập một phần",
        matchedDetail:
          "Có liên hệ tới quá trình làm dự án của bản thân, nhưng còn khái quát, chưa nêu tên tình huống cụ thể và số liệu đo lường.",
      };
    }
  }

  // Generic token overlap fallback
  const stopWords = new Set(["ứng", "viên", "của", "các", "trong", "cho", "với", "hoặc", "như", "cách", "một", "được", "nêu", "rõ"]);
  const sigTokens = normalizeViTokens(signalText).filter((t) => !stopWords.has(t));
  const ansTokenSet = new Set(normalizeViTokens(answerText));
  const matchedTokens = sigTokens.filter((t) => ansTokenSet.has(t));
  const ratio = sigTokens.length > 0 ? matchedTokens.length / sigTokens.length : 0;

  if (ratio >= 0.45) {
    return {
      signal: signalText,
      status: "matched",
      statusLabel: "Đã thể hiện",
      matchedDetail: `Câu trả lời bao phủ tốt các ý khóa trọng tâm (${matchedTokens.slice(0, 4).join(", ")}).`,
    };
  }
  if (ratio >= 0.2) {
    return {
      signal: signalText,
      status: "partial",
      statusLabel: "Đề cập một phần",
      matchedDetail: "Có chạm tới chủ đề liên quan nhưng diễn giải còn ngắn gọn, chưa đi sâu vào chi tiết kỹ thuật.",
    };
  }
  return {
    signal: signalText,
    status: "missing",
    statusLabel: "Chưa nêu rõ",
    matchedDetail: "Chưa tìm thấy dẫn chứng trực tiếp cho ý kỳ vọng này trong câu trả lời.",
  };
}

function criterionReason(
  key: string,
  score5: number,
  hasEvasion: boolean,
  wordCount: number,
): string {
  if (hasEvasion && key !== "clarity_conciseness") {
    return "Điểm bị hạ thấp do ứng viên xác nhận không còn nhớ chi tiết triển khai thực tế.";
  }
  switch (key) {
    case "answer_relevance":
      return score5 >= 3.8
        ? "Bám sát chủ đề câu hỏi, phản hồi đúng ngữ cảnh kỹ thuật được hỏi."
        : score5 >= 2.8
          ? "Trả lời có liên quan nhưng mới giải quyết một nửa vế câu hỏi đặt ra."
          : "Nội dung lệch trọng tâm hoặc chưa đi vào câu hỏi chính.";
    case "technical_correctness":
      return score5 >= 3.8
        ? "Sử dụng hợp lý các khái niệm và luồng xử lý kỹ thuật cốt lõi."
        : score5 >= 2.8
          ? "Nắm khái niệm ở mức cơ bản nhưng thiếu cơ chế hoạt động chuyên sâu bên dưới."
          : "Chưa trình bày được nguyên lý hoặc công cụ kỹ thuật chính xác.";
    case "expected_signal_coverage":
      return score5 >= 3.8
        ? "Bao phủ phần lớn các ý kỳ vọng trong rubric của câu hỏi."
        : score5 >= 2.8
          ? "Đáp ứng được một số tín hiệu nền tảng, còn khuyết các ý phân hóa chiều sâu."
          : "Bỏ sót nhiều tín hiệu quan trọng mà câu hỏi yêu cầu làm rõ.";
    case "reasoning_quality":
      return score5 >= 3.8
        ? "Lập luận có trình tự nguyên nhân – hành động – kết quả rõ ràng."
        : score5 >= 2.8
          ? "Có diễn giải luồng thực hiện nhưng thiếu phân tích lý do chọn giải pháp (trade-off)."
          : "Lập luận rời rạc, chưa giải thích được cách tiếp cận bài toán.";
    case "evidence_quality":
      return score5 >= 3.8
        ? "Có dẫn chứng tình huống thực tế và chi tiết triển khai thuyết phục."
        : score5 >= 2.8
          ? "Dẫn chứng dừng ở mức mô tả khái quát, thiếu ví dụ định danh và số liệu định lượng."
          : "Thiếu hoàn toàn bằng chứng thực tiễn từ dự án cá nhân.";
    case "clarity_conciseness":
      return score5 >= 3.8
        ? `Diễn đạt mạch lạc (${wordCount} từ), câu cú trọn vẹn, dễ theo dõi.`
        : score5 >= 2.8
          ? `Độ dài ${wordCount} từ ở mức vừa phải nhưng cấu trúc ý cần cô đọng hơn.`
          : "Câu trả lời quá ngắn hoặc đứt quãng, khó nắm bắt ý chính.";
    case "consistency":
      return score5 >= 3.8
        ? "Thông tin trả lời nhất quán với định hướng kỹ năng trong CV và JD."
        : score5 >= 2.8
          ? "Tương đối khớp bối cảnh chung nhưng chưa liên kết chặt với dự án đã ghi trong CV."
          : "Thiếu sự nhất quán hoặc chưa đối chiếu được với kinh nghiệm trong hồ sơ.";
    default:
      return "Đánh giá tự động từ mô hình học máy đa tiêu chí.";
  }
}

export function explainTurnEvaluation(
  input: TurnEvaluationInput,
): TurnEvaluationReport {
  const rawAns = (input.answer || "").trim();
  const isPlaceholderMissing =
    !rawAns || rawAns === "(Ứng viên chưa hoàn thành câu trả lời này)";
  const refused =
    isPlaceholderMissing ||
    Boolean(input.isNonAnswerFlag) ||
    isNonAnswer(rawAns);

  const stageCode = (input.stage || "technical").trim().toLowerCase();
  const stageLabel = STAGE_LABELS[stageCode] || input.stage || "Phỏng vấn chuyên môn";
  const compKey = inferCompetencyFromStage(input.stage, input.criterion);
  const compMeta = COMPETENCY_META[compKey] || COMPETENCY_META.technical_knowledge;
  const wordCount = isPlaceholderMissing
    ? 0
    : rawAns.split(/\s+/).filter(Boolean).length;

  const zeroScores: Record<string, number> = {
    answer_relevance: 1.0,
    technical_correctness: 1.0,
    expected_signal_coverage: 1.0,
    reasoning_quality: 1.0,
    evidence_quality: 1.0,
    clarity_conciseness: 1.0,
    consistency: 1.0,
  };

  const hasRaw = input.rawScores && Object.keys(input.rawScores).length > 0;
  const baseScores: Record<string, number> = refused
    ? zeroScores
    : hasRaw
      ? { ...(input.rawScores as Record<string, number>) }
      : {
          answer_relevance: 3.2,
          technical_correctness: 3.1,
          expected_signal_coverage: 3.0,
          reasoning_quality: 3.0,
          evidence_quality: 2.9,
          clarity_conciseness: 3.4,
          consistency: 3.3,
        };

  const {
    scores: calibratedScores,
    hasMemoryEvasion,
    evasionMatches,
  } = refused
    ? { scores: zeroScores, hasMemoryEvasion: false, evasionMatches: [] }
    : applySubstantiveEvidenceCalibration(rawAns, baseScores);

  const applicableList =
    input.applicableCriteria && input.applicableCriteria.length > 0
      ? input.applicableCriteria.filter((c) => MICRO_CRITERIA_META[c])
      : DEFAULT_CRITERIA_ORDER;

  const compWeights =
    EXPORTED_COMPETENCY_SIGNALS[compMeta.mappedKey] ||
    EXPORTED_COMPETENCY_SIGNALS.technical_knowledge;

  // Compute weighted turn score exactly aligned with competency signal weights
  let weightedSum = 0;
  let weightTotal = 0;
  for (const crit of applicableList) {
    const val = Number(calibratedScores[crit] ?? 3.0);
    const w = compWeights[crit] ?? 0.1;
    weightedSum += val * w;
    weightTotal += w;
  }
  const turnScore5 = refused
    ? 1.0
    : weightTotal > 0
      ? Math.round((weightedSum / weightTotal) * 100) / 100
      : 3.0;
  const turnScore100 = refused
    ? 0
    : Math.min(100, Math.max(10, Math.round((turnScore5 / 5.0) * 100)));

  let verdictLabel = "Khá · Đạt yêu cầu cơ bản";
  let verdictTone: TurnEvaluationReport["verdictTone"] = "sky";
  if (refused) {
    verdictLabel = "Không đạt · Bỏ qua / Từ chối trả lời";
    verdictTone = "red";
  } else if (turnScore100 >= 80) {
    verdictLabel = "Tốt · Bằng chứng thuyết phục";
    verdictTone = "emerald";
  } else if (turnScore100 >= 68) {
    verdictLabel = "Khá · Có cơ sở nhưng thiếu chiều sâu";
    verdictTone = "sky";
  } else if (turnScore100 >= 50) {
    verdictLabel = "Trung bình · Dẫn chứng còn mỏng";
    verdictTone = "amber";
  } else {
    verdictLabel = "Cần cải thiện · Thiếu bằng chứng chuyên môn";
    verdictTone = "red";
  }

  // Normalize criteria breakdown weights so percentages sum cleanly to 100%
  const rawWeightsForApplicable = applicableList.map(
    (k) => compWeights[k] ?? 0.08,
  );
  const sumRawW = rawWeightsForApplicable.reduce((a, b) => a + b, 0) || 1;

  const criteriaBreakdown: MicroCriterionDetail[] = applicableList
    .map((key, idx) => {
      const s5 = Number(calibratedScores[key] ?? 3.0);
      const s100 = refused ? 0 : Math.round((s5 / 5.0) * 100);
      const wPct = Math.round((rawWeightsForApplicable[idx] / sumRawW) * 100);
      const levelLabel = refused
        ? "Không có dữ liệu"
        : s5 >= 4.0
          ? "Tốt"
          : s5 >= 3.3
            ? "Khá"
            : s5 >= 2.5
              ? "Trung bình"
              : "Yếu";
      return {
        key,
        label: MICRO_CRITERIA_META[key]?.label || key,
        score5: Math.round(s5 * 100) / 100,
        score100: s100,
        weightPct: wPct,
        levelLabel,
        reason: refused
          ? "Ứng viên bỏ trống hoặc từ chối trả lời nên tiêu chí nhận mức sàn."
          : criterionReason(key, s5, hasMemoryEvasion, wordCount),
      };
    })
    .sort(
      (a, b) =>
        b.weightPct - a.weightPct ||
        (MICRO_CRITERIA_META[a.key]?.order ?? 9) -
          (MICRO_CRITERIA_META[b.key]?.order ?? 9),
    );

  // Extract concrete verbatim quotes & findings from candidate's answer
  const positiveEvidences: EvidenceFinding[] = [];
  const limitationEvidences: EvidenceFinding[] = [];

  if (refused) {
    limitationEvidences.push({
      kind: "limitation",
      quote: isPlaceholderMissing ? undefined : truncateQuote(rawAns),
      criterionTag: "Toàn bộ tiêu chí · 0/100",
      explanation:
        "Ứng viên không đưa ra nội dung trả lời chuyên môn hợp lệ. Lượt hỏi này không đóng góp bằng chứng năng lực và làm giảm tỷ lệ hoàn thành phiên phỏng vấn.",
    });
  } else {
    const clauses = splitIntoClauses(rawAns);
    const detectedTechs = ASR_PHONETIC_TECH_ALIASES.filter((item) =>
      item.pattern.test(rawAns),
    ).map((item) => item.canonical);

    if (hasMemoryEvasion) {
      const evasionClause =
        clauses.find((c) => /(không nhớ|quên|chưa từng)/i.test(c)) || rawAns;
      limitationEvidences.push({
        kind: "limitation",
        quote: truncateQuote(evasionClause),
        criterionTag: `Bằng chứng thực tiễn · ${calibratedScores.evidence_quality?.toFixed(2)}/5,0`,
        explanation: `Ứng viên trực tiếp thừa nhận quên kiến thức ("${evasionMatches.join(", ")}"), không nêu được công cụ, cấu trúc dữ liệu hay cơ chế xử lý cụ thể nên nhóm tiêu chí chuyên môn và dẫn chứng bị hạ điểm mạnh.`,
      });
    } else {
      // 1. Project / experiential context clause
      const contextClause = clauses.find((c) =>
        /(trong quá trình|thực hiện dự án|tại trường|trong dự án|khi làm việc|em sử dụng|tôi có thực hiện)/i.test(
          c,
        ),
      );
      if (contextClause) {
        positiveEvidences.push({
          kind: "positive",
          quote: truncateQuote(contextClause),
          criterionTag: `Độ liên quan · ${(calibratedScores.answer_relevance ?? 3.5).toFixed(2)}/5,0`,
          explanation:
            "Đặt câu trả lời vào bối cảnh thực hiện dự án cụ thể và phản hồi trực tiếp vào chủ đề câu hỏi đặt ra.",
        });
      }

      // 2. Outcome / action-result clause
      const resultClause = clauses.find(
        (c) =>
          c !== contextClause &&
          /(kết quả là|nhằm|giúp|cập nhật vào|hiển thị|biển thị|tôi sẽ bổ sung|bù đắp)/i.test(
            c,
          ),
      );
      if (resultClause) {
        positiveEvidences.push({
          kind: "positive",
          quote: truncateQuote(resultClause),
          criterionTag: `Mạch lạc & Súc tích · ${(calibratedScores.clarity_conciseness ?? 3.8).toFixed(2)}/5,0`,
          explanation:
            "Trình bày rõ mệnh đề kết quả / hướng hành động tiếp theo, giúp mạch diễn đạt hoàn chỉnh và có tính nhất quán cao.",
        });
      }

      // 3. Technical signal mention
      if (detectedTechs.length > 0) {
        positiveEvidences.push({
          kind: "positive",
          criterionTag: `Chính xác kỹ thuật · ${(calibratedScores.technical_correctness ?? 3.5).toFixed(2)}/5,0`,
          explanation: `Nhận diện đúng các thực thể & luồng kỹ thuật liên quan trong câu trả lời: ${detectedTechs.join(", ")}.`,
        });
      }

      // Note if ASR phonetic variants appeared (shows debiased Model 2 intelligence!)
      if (/\b(guest\s*post\s*boot|crod|biển thị|trao diện|dự áo)\b/i.test(rawAns)) {
        positiveEvidences.push({
          kind: "note",
          criterionTag: "Khử thiên vị văn nói ASR (Debiased Scorer)",
          explanation:
            "Câu trả lời có một số từ nhiễu phát âm khi chuyển giọng nói sang văn bản (VD: 'guest post boot delete' → GET/POST/PUT/DELETE, 'CROD' → CRUD); mô hình đã khử thiên vị văn nói nên vẫn ghi nhận đúng bản chất kỹ thuật mà không trừ điểm lỗi chính tả âm thanh.",
        });
      }
    }

    // Limitation checks based on lowest Model 2 criteria & missing depth
    const evScore = Number(calibratedScores.evidence_quality ?? 3.0);
    const reasScore = Number(calibratedScores.reasoning_quality ?? 3.0);
    const hasMetrics = /\b(\d+\s*(%|ms|giây|phút|ngày|tuần|tháng|người|users|requests|bảng|api))\b/i.test(
      rawAns,
    );

    if (!hasMemoryEvasion && evScore < 3.4) {
      limitationEvidences.push({
        kind: "limitation",
        criterionTag: `Bằng chứng thực tiễn · ${evScore.toFixed(2)}/5,0`,
        explanation: hasMetrics
          ? "Đã có số liệu sơ bộ nhưng thiếu tên tình huống thực tế và vai trò xử lý trực tiếp của cá nhân."
          : "Câu trả lời dừng ở mức mô tả khái quát, thiếu dẫn chứng tình huống thực tế định danh và chưa có số liệu đo lường kết quả (metrics, thời gian, phản hồi cụ thể).",
      });
    }

    if (!hasMemoryEvasion && reasScore < 3.45) {
      limitationEvidences.push({
        kind: "limitation",
        criterionTag: `Tư duy & Lập luận · ${reasScore.toFixed(2)}/5,0`,
        explanation:
          "Mới liệt kê thao tác thực hiện ('làm gì'), chưa phân tích sâu lý do lựa chọn phương pháp ('tại sao làm như vậy') hoặc cách xử lý khó khăn phát sinh.",
      });
    }

    if (wordCount > 0 && wordCount < 45) {
      limitationEvidences.push({
        kind: "limitation",
        criterionTag: `Độ sâu trình bày · ${wordCount} từ`,
        explanation: `Dung lượng câu trả lời khá ngắn (${wordCount} từ), chưa đủ không gian để triển khai trọn vẹn mô hình STAR (Tình huống – Nhiệm vụ – Hành động – Kết quả).`,
      });
    }
  }

  // Build Signal Checklist from DB `required_signals` or question prompts
  const rawReqSignals =
    input.requiredSignals && input.requiredSignals.length > 0
      ? input.requiredSignals
      : input.expectedSignal
        ? input.expectedSignal
            .split(/[,;.]\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length >= 10)
            .slice(0, 3)
        : [];

  const signalChecklist: SignalCheckItem[] = rawReqSignals.map((sig) =>
    checkSignalCoverage(sig, isPlaceholderMissing ? "" : rawAns, hasMemoryEvasion || refused),
  );

  // Add concrete missing-signal limitation if any required signal is missing!
  const missingSignals = signalChecklist.filter((s) => s.status === "missing");
  if (!refused && !hasMemoryEvasion && missingSignals.length > 0) {
    limitationEvidences.unshift({
      kind: "limitation",
      criterionTag: `Bao phủ tín hiệu · ${(calibratedScores.expected_signal_coverage ?? 3.5).toFixed(2)}/5,0`,
      explanation: `Còn thiếu ${missingSignals.length}/${signalChecklist.length} ý trọng tâm câu hỏi yêu cầu: ${missingSignals.map((m) => `"${m.signal}"`).join("; ")}.`,
    });
  }

  // Compose concise, transparent Vietnamese summary explaining WHY this turn got its score
  const topCrit = [...criteriaBreakdown].sort((a, b) => b.score5 - a.score5)[0];
  const lowCrit = [...criteriaBreakdown].sort((a, b) => a.score5 - b.score5)[0];

  const verdictSummary = refused
    ? "Câu trả lời bị bỏ trống hoặc từ chối trả lời nên nhận 0/100 điểm và không đóng góp bằng chứng cho nhóm năng lực mục tiêu."
    : hasMemoryEvasion
      ? `Câu trả lời chỉ đạt ${turnScore100}/100 (${turnScore5.toFixed(2)}/5,0) do ứng viên thừa nhận không còn nhớ cách triển khai trong dự án (${wordCount} từ), dẫn tới thiếu hụt hoàn toàn bằng chứng kỹ thuật và cơ chế xử lý cụ thể.`
      : `Câu trả lời đạt ${turnScore100}/100 (${turnScore5.toFixed(2)}/5,0) nhờ điểm mạnh ở tiêu chí "${topCrit?.label}" (${topCrit?.score5.toFixed(2)}/5,0), thể hiện được mạch diễn đạt và khái niệm liên quan; tuy nhiên điểm chưa đạt mức Xuất sắc (≥85) do bị giới hạn bởi "${lowCrit?.label}" (${lowCrit?.score5.toFixed(2)}/5,0) khi còn thiếu ví dụ tình huống chi tiết và các ý kỳ vọng chuyên sâu.`;

  const contributionSummary = refused
    ? `Lượt này đánh giá nhóm "${compMeta.label}" (trọng số ${compMeta.weightPct}% điểm tổng), nhưng do bỏ qua câu hỏi nên điểm lượt = 0 và làm giảm hệ số hoàn thành phiên phỏng vấn.`
    : `Điểm lượt này (${turnScore100}/100) được tổng hợp có trọng số từ ${criteriaBreakdown.length} tiêu chí vi mô ở dưới, đóng góp trực tiếp vào nhóm "${compMeta.label}" (chiếm ${compMeta.weightPct}% Điểm tổng kết) và kết hợp cùng các câu hỏi còn lại theo tỷ lệ hoàn thành phiên để tạo ra Điểm tổng kết cuối cùng.`;

  return {
    turnNumber: input.turnIndex,
    stageCode,
    stageLabel,
    targetCompetencyKey: compMeta.mappedKey,
    targetCompetencyLabel: compMeta.label,
    targetCompetencyWeightPct: compMeta.weightPct,
    wordCount,
    isSkippedOrRefused: refused,
    hasMemoryEvasion,
    turnScore5,
    turnScore100,
    verdictLabel,
    verdictTone,
    verdictSummary,
    positiveEvidences,
    limitationEvidences,
    expectedSignalText: input.expectedSignal || null,
    signalChecklist,
    criteriaBreakdown,
    contributionSummary,
  };
}

