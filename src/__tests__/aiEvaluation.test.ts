import { describe, expect, it } from "vitest";
import { computeAiEvaluation, isNonAnswer } from "@/utils/aiEvaluation";
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
});

