import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Save,
  Star,
  TrendingUp,
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
      fromHistory?.stage || fromSession?.stage || "Phỏng vấn chuyên môn";

    const criterion =
      fromHistory?.criterion || fromSession?.criterion || "Đánh giá năng lực";

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

    return {
      turnIndex: idx + 1,
      stage,
      criterion,
      question,
      answer: answer || "(Ứng viên chưa hoàn thành câu trả lời này)",
    };
  });

  if (turnsToDisplay.length === 0) {
    return (
      <Card className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-[15px] text-zinc-500">
        Chưa có câu hỏi nào được ghi nhận trong phiên phỏng vấn này.
      </Card>
    );
  }

  const current = turnsToDisplay[activeTurn] || turnsToDisplay[0];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <Card className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 lg:col-span-4">
        <div className="mb-3 px-2 text-[14px] font-semibold text-zinc-950">
          Các câu hỏi ({turnsToDisplay.length})
        </div>
        <div className="flex flex-col gap-1.5">
          {turnsToDisplay.map((t, idx) => {
            const isActive = activeTurn === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTurn(idx)}
                className={
                  isActive
                    ? "flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-100/90 px-3 py-3 text-left transition-colors cursor-pointer"
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
                  <div className="text-[14px] font-semibold leading-snug text-zinc-950">
                    Câu hỏi {idx + 1}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-zinc-500">
                    {t.criterion || t.stage || "Kiến thức chuyên môn"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 lg:col-span-8">
        <Badge
          variant="secondary"
          className="px-3 py-1 text-[12px] font-semibold"
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
          CÂU HỎI {activeTurn + 1} · {current.stage.toUpperCase()}
        </Badge>

        <h2 className="m-0 mt-4 text-[19px] font-semibold leading-[1.55] tracking-[-0.01em] text-zinc-950">
          {current.question}
        </h2>

        <div className="mt-6 border-t border-zinc-100 pt-5">
          <h4 className="m-0 mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-zinc-500">
            Câu trả lời của ứng viên
          </h4>
          <p className="m-0 rounded-xl border border-zinc-200 bg-zinc-50/70 px-5 py-4 text-[15px] leading-[1.7] text-zinc-800">
            "{current.answer}"
          </p>
        </div>
      </Card>
    </div>
  );
}
