import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  FileSearch,
  Info,
  Lightbulb,
  MessageSquare,
  Quote,
  Save,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getInterviewSessionById,
  getSessionReview,
  loadInterviewSession,
  updateSessionReview,
  type InterviewReview,
  type InterviewSession,
} from "@/services/interviewApi";
import type { TranscriptResult } from "@/services/sttApi";
import { computeAiEvaluation } from "@/utils/aiEvaluation";
import { explainTurnEvaluation } from "@/utils/turnEvidenceExplainer";
import { VideoReport } from "./VideoReport";

const DECISION_OPTIONS: {
  value: InterviewReview["decision"];
  label: string;
}[] = [
  { value: "pending", label: "Chờ xem xét" },
  { value: "shortlisted", label: "Đã đưa vào Shortlist" },
  { value: "interview_next", label: "Mời phỏng vấn vòng tiếp" },
  { value: "hired", label: "Đề xuất tuyển dụng" },
  { value: "rejected", label: "Chưa phù hợp" },
];

export function ReportContent({
  sessionId,
  session: propSession,
  candidateView = false,
  onBack,
}: {
  sessionId?: string;
  session?: InterviewSession | null;
  candidateView?: boolean;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState("Tổng quan");
  const [session, setSession] = useState<InterviewSession | null>(
    propSession || loadInterviewSession(sessionId),
  );
  const [loadingSession, setLoadingSession] = useState(false);

  // HR Review / Shortlist state (persisted in PostgreSQL)
  const [shortlisted, setShortlisted] = useState<boolean>(
    Boolean(propSession?.review?.shortlisted),
  );
  const [decision, setDecision] = useState<InterviewReview["decision"]>(
    propSession?.review?.decision || "pending",
  );
  const [hrNotes, setHrNotes] = useState<string>(
    propSession?.review?.hr_notes || "",
  );
  const [savingReview, setSavingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string>("");
  const [reviewErr, setReviewErr] = useState<string>("");

  const effectiveSessionId = session?.session_id || (sessionId !== "latest" ? sessionId : undefined);

  useEffect(() => {
    let mounted = true;
    if (propSession) {
      setSession(propSession);
      if (propSession.review) {
        setShortlisted(Boolean(propSession.review.shortlisted));
        setDecision(propSession.review.decision || "pending");
        setHrNotes(propSession.review.hr_notes || "");
      }
      return;
    }
    if (sessionId && sessionId !== "latest") {
      setLoadingSession(true);
      getInterviewSessionById(sessionId)
        .then((fetched) => {
          if (mounted && fetched) {
            setSession(fetched);
            if (fetched.review) {
              setShortlisted(Boolean(fetched.review.shortlisted));
              setDecision(fetched.review.decision || "pending");
              setHrNotes(fetched.review.hr_notes || "");
            }
          }
        })
        .finally(() => {
          if (mounted) setLoadingSession(false);
        });
    } else {
      setSession(loadInterviewSession());
    }
    return () => {
      mounted = false;
    };
  }, [sessionId, propSession]);

  // Hydrate HR review from DB for Admin/Recruiter
  useEffect(() => {
    if (candidateView || !effectiveSessionId) return;
    let mounted = true;
    getSessionReview(effectiveSessionId).then((rev) => {
      if (!mounted || !rev) return;
      setShortlisted(Boolean(rev.shortlisted));
      setDecision(rev.decision || "pending");
      setHrNotes(rev.hr_notes || "");
    });
    return () => {
      mounted = false;
    };
  }, [candidateView, effectiveSessionId]);

  const handleToggleShortlist = async () => {
    if (!effectiveSessionId) return;
    const nextShortlisted = !shortlisted;
    setSavingReview(true);
    setReviewMsg("");
    setReviewErr("");
    try {
      const updated = await updateSessionReview(effectiveSessionId, {
        shortlisted: nextShortlisted,
      });
      setShortlisted(Boolean(updated.shortlisted));
      setDecision(updated.decision);
      setReviewMsg(
        updated.shortlisted
          ? "Đã thêm ứng viên vào danh sách Shortlist."
          : "Đã bỏ ứng viên khỏi danh sách Shortlist.",
      );
      setTimeout(() => setReviewMsg(""), 3500);
    } catch (err: any) {
      setReviewErr(err?.message || "Không thể cập nhật trạng thái shortlist.");
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveHrReview = async () => {
    if (!effectiveSessionId) return;
    setSavingReview(true);
    setReviewMsg("");
    setReviewErr("");
    try {
      const updated = await updateSessionReview(effectiveSessionId, {
        shortlisted,
        decision,
        hr_notes: hrNotes,
      });
      setShortlisted(Boolean(updated.shortlisted));
      setDecision(updated.decision);
      setHrNotes(updated.hr_notes || "");
      setReviewMsg("Đã lưu đánh giá và ghi chú tuyển dụng.");
      setTimeout(() => setReviewMsg(""), 3500);
    } catch (err: any) {
      setReviewErr(err?.message || "Không thể lưu ghi chú tuyển dụng.");
    } finally {
      setSavingReview(false);
    }
  };

  if (loadingSession && !session) {
    return (
      <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
        Đang tải dữ liệu báo cáo phỏng vấn...
      </Card>
    );
  }

  const evalData = computeAiEvaluation(session);

  return (
    <>
      <PageHeader
        title={candidateView ? "Kết quả của tôi" : evalData.candidateName}
        description={
          candidateView
            ? `${evalData.candidateName ? `${evalData.candidateName} · ` : ""}${evalData.jobTitle}`
            : evalData.jobTitle
        }
        backButton={onBack ? { onClick: onBack, label: "Quay lại" } : undefined}
        showNotifications={false}
        action={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="lg" onClick={() => window.print()}>
              <ArrowDownToLine /> Tải PDF
            </Button>
            {!candidateView && effectiveSessionId && (
              <Button
                size="lg"
                variant={shortlisted ? "secondary" : "default"}
                disabled={savingReview}
                onClick={handleToggleShortlist}
                className={
                  shortlisted
                    ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : undefined
                }
              >
                <Star
                  className={
                    shortlisted
                      ? "fill-amber-500 text-amber-500"
                      : undefined
                  }
                />
                {shortlisted ? "Đã trong Shortlist" : "Thêm vào shortlist"}
              </Button>
            )}
          </div>
        }
      />

      {reviewMsg && (
        <Alert variant="success" className="mb-4">
          <Check className="h-4 w-4" />
          <AlertDescription>{reviewMsg}</AlertDescription>
        </Alert>
      )}
      {reviewErr && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{reviewErr}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10 border border-zinc-200 bg-white p-1">
            {["Tổng quan", "Đánh giá câu hỏi", "Phân tích hình ảnh"].map((t) => (
              <TabsTrigger key={t} value={t} className="px-4">
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {tab === "Tổng quan" ? (
        <Overview
          session={session}
          candidateView={candidateView}
          decision={decision}
          onDecisionChange={setDecision}
          hrNotes={hrNotes}
          onHrNotesChange={setHrNotes}
          savingReview={savingReview}
          onSaveReview={handleSaveHrReview}
        />
      ) : tab === "Đánh giá câu hỏi" ? (
        <QuestionReview session={session} />
      ) : (
        <VideoReport sessionId={effectiveSessionId} />
      )}
    </>
  );
}

function Overview({
  session,
  candidateView,
  decision,
  onDecisionChange,
  hrNotes,
  onHrNotesChange,
  savingReview,
  onSaveReview,
}: {
  session?: InterviewSession | null;
  candidateView: boolean;
  decision: InterviewReview["decision"];
  onDecisionChange: (val: InterviewReview["decision"]) => void;
  hrNotes: string;
  onHrNotesChange: (val: string) => void;
  savingReview: boolean;
  onSaveReview: () => void;
}) {
  const currentSession = session || loadInterviewSession();
  const isCurrentActiveSession =
    !currentSession?.session_id ||
    currentSession.session_id === sessionStorage.getItem("current_session_id");
  const history: any[] = (() => {
    if (!isCurrentActiveSession) return [];
    try {
      const h = sessionStorage.getItem("interview_turns_history");
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  })();

  const evalData = computeAiEvaluation(currentSession, history);

  const radarData = [
    { axis: "Chuyên môn", score: evalData.competencies[0]?.score ?? 0 },
    { axis: "Tư duy", score: evalData.competencies[1]?.score ?? 0 },
    { axis: "Dẫn chứng", score: evalData.competencies[2]?.score ?? 0 },
    { axis: "Giao tiếp", score: evalData.competencies[3]?.score ?? 0 },
    { axis: "Phù hợp JD", score: evalData.competencies[4]?.score ?? 0 },
  ];

  const scoreTone =
    evalData.overallScore >= 80
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : evalData.overallScore >= 50
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="space-y-5">
      {/* Score Hero */}
      <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="flex items-center justify-center lg:col-span-2">
            <div
              className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 ${scoreTone}`}
            >
              <span className="text-3xl font-bold leading-none tabular-nums">
                {evalData.overallScore}
              </span>
              <span className="mt-1 text-xs font-medium opacity-75">/ 100</span>
            </div>
          </div>

          <div className="space-y-2.5 lg:col-span-7">
            <h2 className="m-0 text-xl font-bold text-zinc-950">
              {evalData.levelText}
            </h2>
            <p className="m-0 text-sm leading-relaxed text-zinc-600">
              Hồ sơ <b className="text-zinc-900">{evalData.candidateName}</b> đã
              hoàn thành{" "}
              <b className="text-zinc-900">{evalData.answeredCount}</b> câu hỏi
              phỏng vấn cho vị trí{" "}
              <b className="text-zinc-900">{evalData.jobTitle}</b>. Hệ thống AI
              tổng hợp trên 5 nhóm năng lực cốt lõi.
            </p>
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold">Đề xuất của AI: </span>
                {evalData.recommendation}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 lg:col-span-3 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Số câu trả lời
              </div>
              <div className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums">
                {evalData.answeredCount} câu
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Độ tin cậy
              </div>
              <div className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums">
                {evalData.confidence}%
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Nguồn đánh giá
              </div>
              <div className="mt-0.5 text-sm font-bold text-zinc-900">
                Hệ thống AI
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Competency Bars + Recharts Radar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-7">
          <div className="mb-4">
            <h3 className="m-0 text-base font-bold text-zinc-950">
              Điểm 5 nhóm năng lực cốt lõi
            </h3>
            <p className="m-0 mt-0.5 text-xs text-zinc-500">
              Tính tổng hợp theo trọng số AI từ các câu trả lời thực tế
            </p>
          </div>
          <div className="space-y-4">
            {evalData.competencies.map((comp) => {
              const barColor =
                comp.score >= 80
                  ? "bg-emerald-500"
                  : comp.score >= 60
                    ? "bg-amber-500"
                    : "bg-red-500";
              return (
                <div key={comp.key}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-zinc-900">
                      {comp.label}
                    </span>
                    <span className="text-[13px] font-bold text-emerald-700 tabular-nums">
                      {comp.score}
                      <span className="text-[11px] font-normal text-zinc-400">
                        /100
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500">
                    {comp.desc} · <span className="italic">{comp.level}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-5">
          <div className="mb-2">
            <h3 className="m-0 text-base font-bold text-zinc-950">
              Bản đồ năng lực (Radar)
            </h3>
            <p className="m-0 mt-0.5 text-xs text-zinc-500">
              5 chiều năng lực đánh giá trên thang 100
            </p>
          </div>
          <div className="h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#3f3f46", fontSize: 12, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                />
                <Radar
                  name="Điểm năng lực"
                  dataKey="score"
                  stroke="#059669"
                  fill="#10b981"
                  fillOpacity={0.28}
                  strokeWidth={2}
                />
                <RechartsTooltip
                  formatter={(v) => [`${v}/100`, "Điểm"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e4e7",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="m-0 text-sm font-bold text-zinc-950">
              Điểm mạnh nổi bật
            </h3>
          </div>
          <ul className="m-0 space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            {evalData.strengths.map((str, i) => (
              <li key={i}>{str}</li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Lightbulb className="h-4 w-4" />
            </span>
            <h3 className="m-0 text-sm font-bold text-zinc-950">
              Gợi ý cải thiện theo dữ liệu
            </h3>
          </div>
          <ul className="m-0 space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            {evalData.improvements.map((imp, i) => (
              <li key={i}>{imp}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* HR Decision & Notes Panel (Admin / Recruiter only) */}
      {!candidateView && currentSession?.session_id && (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="m-0 text-base font-bold text-zinc-950">
                Đánh giá & Ghi chú của Nhà tuyển dụng
              </h3>
              <p className="m-0 mt-0.5 text-xs text-zinc-500">
                Lưu trực tiếp vào hệ thống để đội tuyển dụng theo dõi trạng thái
                ứng viên.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value={decision}
                onValueChange={(v) =>
                  onDecisionChange(v as InterviewReview["decision"])
                }
              >
                <SelectTrigger className="h-9 bg-white text-xs">
                  <SelectValue placeholder="Chọn quyết định" />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <textarea
            rows={3}
            value={hrNotes}
            onChange={(e) => onHrNotesChange(e.target.value)}
            placeholder="Nhập nhận xét của HR/Interviewer về ứng viên, điểm cần hỏi sâu ở vòng sau..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
          />

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={savingReview}
              onClick={onSaveReview}
            >
              <Save className="h-3.5 w-3.5" />
              {savingReview ? "Đang lưu..." : "Lưu nhận xét HR"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function QuestionReview({
  transcript,
  session: propSession,
}: {
  transcript?: TranscriptResult | null;
  session?: InterviewSession | null;
}) {
  const [activeTurn, setActiveTurn] = useState(0);
  const session = propSession || loadInterviewSession();
  const isCurrentActiveSession =
    !session?.session_id ||
    session.session_id === sessionStorage.getItem("current_session_id");

  const historyTurns: any[] = (() => {
    if (!isCurrentActiveSession) return [];
    try {
      const h = sessionStorage.getItem("interview_turns_history");
      return h ? JSON.parse(h) : [];
    } catch {
      return [];
    }
  })();

  const evalData = computeAiEvaluation(session, historyTurns);
  const totalExpected =
    session?.max_questions ||
    Math.max(session?.turns?.length || 0, historyTurns.length || 0, 1);

  const rawSessionTurns = session?.turns || [];
  const maxTurns = Math.max(rawSessionTurns.length, historyTurns.length);

  const turnsToDisplay = Array.from({ length: maxTurns }, (_, idx) => {
    const fromHistory = historyTurns[idx];
    const fromSession = rawSessionTurns[idx];

    const question =
      fromHistory?.question ||
      fromSession?.question ||
      (fromSession as any)?.question_text ||
      (idx === 0 ? sessionStorage.getItem("current_question_text") : null) ||
      `Câu hỏi ${idx + 1}`;

    const stage =
      fromHistory?.stage || fromSession?.stage || "technical";

    const criterion =
      fromHistory?.criterion || fromSession?.criterion || null;

    let answer =
      fromHistory?.answer ||
      fromSession?.answer ||
      (fromSession as any)?.answer_text ||
      null;
    if (!answer && idx === 0 && transcript?.corrected_transcript) {
      answer = transcript.corrected_transcript;
    }
    if (
      !answer &&
      sessionStorage.getItem("last_turn_answer") &&
      idx === maxTurns - 1
    ) {
      answer = sessionStorage.getItem("last_turn_answer");
    }

    const evidenceObj =
      fromSession?.answer_evidence ||
      fromHistory?.answer_evidence ||
      (fromSession as any)?.answer_scores_json ||
      null;

    const rawScores =
      (evidenceObj?.scores && Object.keys(evidenceObj.scores).length > 0
        ? evidenceObj.scores
        : evidenceObj?.applicable_scores) ||
      fromHistory?.scores ||
      null;

    const applicableCriteria =
      evidenceObj?.applicable_criteria || null;

    // Fallback extraction from question_candidates if session came from older localStorage cache
    const selectedCand = Array.isArray((fromSession as any)?.question_candidates)
      ? (fromSession as any).question_candidates.find((c: any) => c?.selected) ||
        (fromSession as any).question_candidates[0]
      : null;

    const detail = explainTurnEvaluation({
      turnIndex: idx + 1,
      stage,
      criterion: criterion || selectedCand?.criterion || null,
      question,
      answer,
      expectedSignal:
        fromSession?.expected_signal ||
        fromHistory?.expected_signal ||
        selectedCand?.expected_signal ||
        null,
      requiredSignals:
        fromSession?.required_signals ||
        fromHistory?.required_signals ||
        selectedCand?.required_signals ||
        [],
      bonusSignals:
        fromSession?.bonus_signals ||
        fromHistory?.bonus_signals ||
        selectedCand?.bonus_signals ||
        [],
      rawScores,
      applicableCriteria,
      isNonAnswerFlag: Boolean(evidenceObj?.is_non_answer),
    });

    return {
      turnIndex: idx + 1,
      stage,
      criterion,
      question,
      answer: answer || "(Ứng viên chưa hoàn thành câu trả lời này)",
      detail,
    };
  });

  if (turnsToDisplay.length === 0) {
    return (
      <Card className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-[15px] text-zinc-500">
        Chưa có câu hỏi nào được ghi nhận trong phiên phỏng vấn này.
      </Card>
    );
  }

  const safeIdx = Math.min(activeTurn, turnsToDisplay.length - 1);
  const current = turnsToDisplay[safeIdx] || turnsToDisplay[0];
  const d = current.detail;

  const toneBadgeClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sky: "border-teal-200 bg-teal-50 text-teal-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
  }[d.verdictTone];

  const matchedCompetencyOnOverview = evalData.competencies.find(
    (c) => c.key === d.targetCompetencyKey,
  );

  return (
    <div className="space-y-5">
      {/* Top Bridge: How per-question scores lead to Overall Score */}
      <Card className="rounded-2xl border border-zinc-200 bg-white p-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Calculator className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[13.5px] font-bold text-zinc-950">
                Lộ trình tổng hợp từ Điểm từng câu trả lời → Điểm tổng kết phiên ({evalData.overallScore}/100)
              </div>
              <p className="m-0 mt-0.5 text-xs leading-relaxed text-zinc-500">
                Mỗi câu trả lời được chấm trên 7 tiêu chí bằng chứng vi mô (thang 1–5), quy đổi vào 5 nhóm năng lực theo trọng số chuyên môn và nhân với tỷ lệ hoàn thành ({evalData.answeredCount}/{totalExpected} câu hợp lệ).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {turnsToDisplay.map((item, i) => {
              const pillColor =
                item.detail.turnScore100 >= 80
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : item.detail.turnScore100 >= 65
                    ? "border-teal-200 bg-teal-50 text-teal-700"
                    : item.detail.turnScore100 >= 50
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-red-200 bg-red-50 text-red-700";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveTurn(i)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${pillColor} ${
                    safeIdx === i ? "ring-2 ring-zinc-900/15" : "opacity-85 hover:opacity-100"
                  }`}
                >
                  <span>Câu {i + 1}:</span>
                  <span className="tabular-nums font-bold">
                    {item.detail.turnScore100}đ
                  </span>
                </button>
              );
            })}
            <ArrowRight className="mx-0.5 h-3.5 w-3.5 text-zinc-400" />
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-bold text-white tabular-nums">
              Điểm tổng: {evalData.overallScore}/100
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Question Selector */}
        <Card className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-[14px] font-semibold text-zinc-950">
              Các câu hỏi ({turnsToDisplay.length})
            </span>
            <span className="text-[11px] font-medium text-zinc-400">
              Chọn để xem bằng chứng
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {turnsToDisplay.map((t, idx) => {
              const isActive = safeIdx === idx;
              const sc = t.detail.turnScore100;
              const pillStyle =
                sc >= 80
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : sc >= 65
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : sc >= 50
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-red-50 text-red-700 border-red-200";
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTurn(idx)}
                  className={
                    isActive
                      ? "flex w-full items-center gap-3 rounded-xl border border-zinc-300 bg-zinc-100/90 px-3 py-3 text-left transition-colors cursor-pointer"
                      : "flex w-full items-center gap-3 rounded-xl border border-transparent bg-transparent px-3 py-3 text-left transition-colors hover:bg-zinc-50 cursor-pointer"
                  }
                >
                  <span
                    className={
                      isActive
                        ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-semibold text-white tabular-nums"
                        : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[13px] font-semibold text-zinc-600 tabular-nums"
                    }
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold leading-snug text-zinc-950">
                        Câu hỏi {idx + 1}
                      </span>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${pillStyle}`}
                      >
                        {sc}/100
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-zinc-500">
                      {t.detail.targetCompetencyLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right Detail & Evidence Breakdown */}
        <Card className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 lg:col-span-8">
          {/* Header Row: Stage + Competency + Turn Score */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="px-3 py-1 text-[12px] font-semibold"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                CÂU HỎI {safeIdx + 1} · {d.stageCode.toUpperCase()}
              </Badge>
              <Badge
                variant="outline"
                className="border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11.5px] font-medium text-zinc-700"
              >
                <Target className="mr-1 h-3 w-3 text-zinc-500" />
                {d.targetCompetencyLabel} ({d.targetCompetencyWeightPct}% điểm tổng)
              </Badge>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 ${toneBadgeClasses}`}
            >
              <span className="text-lg font-extrabold tabular-nums">
                {d.turnScore100}/100
              </span>
              <span className="text-xs opacity-75 tabular-nums">
                ({d.turnScore5.toFixed(2)}/5,0)
              </span>
              <span className="hidden sm:inline text-xs font-semibold">
                · {d.verdictLabel.split("·")[0].trim()}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <h2 className="m-0 mt-4 text-[18px] font-semibold leading-[1.55] tracking-[-0.01em] text-zinc-950">
            {current.question}
          </h2>

          {/* Candidate Answer */}
          <div className="mt-5 border-t border-zinc-100 pt-5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h4 className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-zinc-500">
                Câu trả lời của ứng viên
              </h4>
              {d.wordCount > 0 && (
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 tabular-nums">
                  Độ dài: {d.wordCount} từ
                </span>
              )}
            </div>
            <p className="m-0 rounded-xl border border-zinc-200 bg-zinc-50/70 px-5 py-4 text-[14.5px] leading-[1.7] text-zinc-800">
              "{current.answer}"
            </p>
          </div>

          {/* Section 1: Verdict & Extracted Textual Evidence */}
          <div className="mt-6 border-t border-zinc-100 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-emerald-600" />
              <h4 className="m-0 text-[13.5px] font-bold uppercase tracking-[0.03em] text-zinc-900">
                Giải thích mức điểm & Bằng chứng trích xuất từ câu trả lời
              </h4>
            </div>

            <div className={`rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed ${toneBadgeClasses}`}>
              <span className="font-bold">{d.verdictLabel}: </span>
              {d.verdictSummary}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Positive Evidence Card */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/35 p-4">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  Bằng chứng ghi nhận điểm cộng ({d.positiveEvidences.length})
                </div>
                {d.positiveEvidences.length === 0 ? (
                  <p className="m-0 text-xs leading-relaxed text-zinc-500 italic">
                    Chưa trích xuất được bằng chứng chuyên môn hoặc ví dụ thuyết phục trong câu trả lời này.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {d.positiveEvidences.map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-emerald-200/70 bg-white/90 p-3 text-xs leading-relaxed"
                      >
                        <div className="mb-1 inline-flex items-center gap-1 rounded bg-emerald-100/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                          {ev.kind === "note" ? (
                            <Sparkles className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          {ev.criterionTag}
                        </div>
                        {ev.quote && (
                          <div className="my-1.5 flex items-start gap-1.5 border-l-2 border-emerald-500 pl-2.5 italic text-zinc-700">
                            <Quote className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                            <span>"{ev.quote}"</span>
                          </div>
                        )}
                        <div className="text-zinc-700">{ev.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Limitations / Missing Evidence Card */}
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/35 p-4">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-bold text-amber-950">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  Hạn chế / Bằng chứng còn thiếu ({d.limitationEvidences.length})
                </div>
                {d.limitationEvidences.length === 0 ? (
                  <p className="m-0 text-xs leading-relaxed text-zinc-600">
                    Câu trả lời đã đáp ứng đầy đủ các tiêu chí bằng chứng trọng tâm của câu hỏi.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {d.limitationEvidences.map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-amber-200/80 bg-white/90 p-3 text-xs leading-relaxed"
                      >
                        <div className="mb-1 inline-flex items-center gap-1 rounded bg-amber-100/80 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-900">
                          {ev.criterionTag}
                        </div>
                        {ev.quote && (
                          <div className="my-1.5 flex items-start gap-1.5 border-l-2 border-red-400 pl-2.5 italic text-red-800">
                            <Quote className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                            <span>"{ev.quote}"</span>
                          </div>
                        )}
                        <div className="text-zinc-700">{ev.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Expected Signal & Required Checkpoints */}
          {(d.expectedSignalText || d.signalChecklist.length > 0) && (
            <div className="mt-6 border-t border-zinc-100 pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <h4 className="m-0 text-[13.5px] font-bold uppercase tracking-[0.03em] text-zinc-900">
                  Đối chiếu Tín hiệu kỳ vọng của câu hỏi (Rubric Checkpoints)
                </h4>
              </div>

              {d.expectedSignalText && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs leading-relaxed text-zinc-700">
                  <span className="font-semibold text-zinc-900">
                    Đáp án / Tín hiệu kỳ vọng từ AI:{" "}
                  </span>
                  {d.expectedSignalText}
                </div>
              )}

              {d.signalChecklist.length > 0 && (
                <div className="space-y-2">
                  {d.signalChecklist.map((chk, i) => {
                    const badgeCls =
                      chk.status === "matched"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : chk.status === "partial"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-red-200 bg-red-50 text-red-700";
                    return (
                      <div
                        key={i}
                        className="flex flex-col gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
                            {chk.status === "matched" ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : chk.status === "partial" ? (
                              <Info className="h-4 w-4 shrink-0 text-amber-500" />
                            ) : (
                              <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                            )}
                            <span>{chk.signal}</span>
                          </div>
                          <div className="mt-0.5 pl-6 text-xs text-zinc-500">
                            {chk.matchedDetail}
                          </div>
                        </div>
                        <span
                          className={`self-start sm:self-center shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeCls}`}
                        >
                          {chk.statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 3: 7 Micro-Evidence Criteria Breakdown */}
          <div className="mt-6 border-t border-zinc-100 pt-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h4 className="m-0 text-[13.5px] font-bold uppercase tracking-[0.03em] text-zinc-900">
                  Chi tiết điểm {d.criteriaBreakdown.length} tiêu chí vi mô (Mô hình chấm điểm AI)
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">
                Thang chuẩn 1,0 – 5,0
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {d.criteriaBreakdown.map((crit) => {
                const barCls =
                  crit.score5 >= 4.0
                    ? "bg-emerald-500"
                    : crit.score5 >= 3.3
                      ? "bg-teal-500"
                      : crit.score5 >= 2.5
                        ? "bg-amber-500"
                        : "bg-red-500";
                return (
                  <div
                    key={crit.key}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-zinc-900">
                        {crit.label}
                      </span>
                      <span className="text-[12.5px] font-bold text-zinc-900 tabular-nums">
                        {crit.score5.toFixed(2)}
                        <span className="text-[11px] font-normal text-zinc-400">
                          /5,0
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80">
                      <div
                        className={`h-full rounded-full ${barCls}`}
                        style={{ width: `${Math.max(8, crit.score100)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-medium text-zinc-500">
                      <span>Mức: {crit.levelLabel}</span>
                      <span>Trọng số câu: {crit.weightPct}%</span>
                    </div>
                    <p className="m-0 mt-1 text-[11.5px] leading-snug text-zinc-600">
                      {crit.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Contribution to Overall Score */}
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 text-xs leading-relaxed text-zinc-700">
            <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-bold text-zinc-900">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              Đóng góp vào Điểm tổng kết phiên ({evalData.overallScore}/100)
            </div>
            <div>{d.contributionSummary}</div>
            {matchedCompetencyOnOverview && (
              <div className="mt-2 flex flex-wrap items-center gap-2 pt-1.5 border-t border-zinc-200/70 text-[11.5px]">
                <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 font-semibold text-zinc-800">
                  Điểm câu {safeIdx + 1}: {d.turnScore100}/100
                </span>
                <ArrowRight className="h-3 w-3 text-zinc-400" />
                <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 font-semibold text-zinc-800">
                  Nhóm "{matchedCompetencyOnOverview.label}": {matchedCompetencyOnOverview.score}/100 (Trọng số {d.targetCompetencyWeightPct}%)
                </span>
                <ArrowRight className="h-3 w-3 text-zinc-400" />
                <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 font-bold text-white">
                  Điểm tổng kết: {evalData.overallScore}/100
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
