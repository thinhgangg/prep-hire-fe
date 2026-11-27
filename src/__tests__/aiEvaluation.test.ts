import { describe, expect, it } from "vitest";
import { computeAiEvaluation, isNonAnswer } from "@/utils/aiEvaluation";
import { explainTurnEvaluation } from "@/utils/turnEvidenceExplainer";
import type { InterviewSession } from "@/services/interviewApi";

describe("aiEvaluation scoring & dynamic insights", () => {
  it("detects refusal / non-answers accurately", () => {
    expect(isNonAnswer("")).toBe(true);
    expect(isNonAnswer("Em không biết câu này ạ")).toBe(true);
    expect(isNonAnswer("skip")).toBe(true);
    expect(
      isNonAnswer(
        "Em chưa dùng Redis Cluster trực tiếp nhưng em hiểu cơ chế sharding và replication.",
      ),
    ).toBe(false);
  });

  it("scores 0 when candidate skips every question", () => {
    const session: InterviewSession = {
      session_id: "s-zero",
      status: "completed",
      language: "vi",
      max_questions: 3,
      current_stage: "completed",
      current_question: null,
      turns: [
        { turn_index: 0, stage: "intro", question: "Q1", answer: "không biết", question_source: "ai" },
        { turn_index: 1, stage: "tech", question: "Q2", answer: "bỏ qua", question_source: "ai" },
        { turn_index: 2, stage: "tech", question: "Q3", answer: "", question_source: "ai" },
      ],
    };

    const result = computeAiEvaluation(session);
    expect(result.overallScore).toBe(0);
    expect(result.answeredCount).toBe(0);
  });

  it("produces dynamic improvements targeting the lowest competencies instead of static text", () => {
    const session: InterviewSession = {
      session_id: "s-good",
      status: "completed",
      language: "vi",
      max_questions: 2,
      current_stage: "completed",
      current_question: null,
      job_profile_json: { title: "Backend Engineer" },
      cv_profile_json: { name: "Tran Minh" },
      turns: [
        {
          turn_index: 0,
          stage: "technical",
          question: "Explain indexing",
          answer: "B-Tree index giúp tối ưu truy vấn O(log N) trên PostgreSQL.",
          question_source: "ai",
          answer_evidence: {
            scores: {
              answer_relevance: 4.6,
              technical_correctness: 4.8,
              expected_signal_coverage: 4.4,
              reasoning_quality: 4.5,
              evidence_quality: 2.2,
              clarity_conciseness: 4.5,
              consistency: 4.5,
            },
          },
        },
        {
          turn_index: 1,
          stage: "technical",
          question: "Explain caching",
          answer: "Redis cache giảm tải DB và hạ độ trễ phản hồi API.",
          question_source: "ai",
          answer_evidence: {
            scores: {
              answer_relevance: 4.5,
              technical_correctness: 4.7,
              expected_signal_coverage: 4.3,
              reasoning_quality: 4.4,
              evidence_quality: 2.4,
              clarity_conciseness: 4.6,
              consistency: 4.5,
            },
          },
        },
      ],
    };

    const result = computeAiEvaluation(session);
    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect(result.candidateName).toBe("Tran Minh");
    expect(result.jobTitle).toBe("Backend Engineer");
    // Lowest competency (experience_evidence) must appear first in improvements
    expect(result.improvements[0]).toContain("Kinh nghiệm thực chiến");
  });

  it("extracts verbatim evidence quotes, signal coverage, and penalizes memory-evasion answers", () => {
    const turn1 = explainTurnEvaluation({
      turnIndex: 1,
      stage: "introduction",
      criterion: "communication",
      question: "Hãy kể lại lần bạn giải thích RESTful API cho đồng nghiệp không chuyên môn.",
      answer:
        "Trong quá trình thực hiện dự án của mình thì em sử dụng các phương thức về guest post boot delete để thực hiện các chức năng CROD dữ liệu Kết quả là nó sẽ tham chiếu các dữ liệu từ người dùng và cập nhật vào trong database.",
      expectedSignal: "Ví dụ cụ thể, cách điều chỉnh ngôn ngữ cho người không chuyên, và kết quả.",
      requiredSignals: [
        "câu chuyện thực tế",
        "cách điều chỉnh ngôn ngữ cho người không chuyên",
        "kết quả hoặc phản hồi tích cực",
      ],
      rawScores: {
        answer_relevance: 4.02,
        technical_correctness: 3.72,
        expected_signal_coverage: 3.58,
        reasoning_quality: 3.17,
        evidence_quality: 3.02,
        clarity_conciseness: 4.37,
        consistency: 4.28,
      },
      applicableCriteria: [
        "answer_relevance",
        "expected_signal_coverage",
        "reasoning_quality",
        "evidence_quality",
        "clarity_conciseness",
        "consistency",
      ],
    });

    expect(turn1.turnScore100).toBeGreaterThanOrEqual(75);
    expect(turn1.positiveEvidences.length).toBeGreaterThan(0);
    expect(turn1.limitationEvidences.length).toBeGreaterThan(0);
    expect(
      turn1.signalChecklist.some((s) => s.status === "missing"),
    ).toBe(true);

    const turn2Evasive = explainTurnEvaluation({
      turnIndex: 2,
      stage: "technical",
      criterion: "technical_knowledge",
      question: "Bạn đã xử lý state management như thế nào?",
      answer:
        "Câu hỏi, trong dự án này thì tôi làm ở năm 2 nên tôi không nhớ nữa. Tuy nhiên là tôi xử lý các trạng thái khi truy cập nhiều dữ liệu thì tôi không nhớ nữa.",
      requiredSignals: ["Xác định công cụ state management đã dùng"],
      rawScores: {
        answer_relevance: 3.98,
        technical_correctness: 3.73,
        expected_signal_coverage: 3.55,
        reasoning_quality: 3.19,
        evidence_quality: 3.0,
        clarity_conciseness: 4.35,
        consistency: 4.24,
      },
    });

    expect(turn2Evasive.hasMemoryEvasion).toBe(true);
    expect(turn2Evasive.turnScore100).toBeLessThan(50);
    expect(turn2Evasive.limitationEvidences[0].quote).toContain("không nhớ");
  });
});

