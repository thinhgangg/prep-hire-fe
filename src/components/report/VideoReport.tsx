import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Download,
  Eye,
  EyeOff,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserX,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  persistedGazeToReportResult,
  type GazeEvent,
  type GazeReportResult,
} from "@/services/gazeTracker";
import { getSessionGazeReport } from "@/services/interviewApi";
import {
  getIntegrityRankMeta,
  INTEGRITY_DISCLAIMER,
  INTEGRITY_RUBRIC,
  type IntegrityRank,
} from "@/utils/integrityRubric";

function loadLocalSessionGaze(sessionId?: string): GazeReportResult | null {
  if (!sessionId || sessionId === "latest") return null;
  try {
    const byId = localStorage.getItem(`gaze_result_${sessionId}`);
    return byId ? (JSON.parse(byId) as GazeReportResult) : null;
  } catch {
    return null;
  }
}

function rankBadgeVariant(rank: IntegrityRank): "success" | "warning" | "destructive" {
  if (rank === "HIGH") return "success";
  if (rank === "MEDIUM") return "warning";
  return "destructive";
}

function rankCircleClasses(rank: IntegrityRank): string {
  if (rank === "HIGH") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (rank === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-red-200 bg-red-50 text-red-700";
}

export function VideoReport({ sessionId }: { sessionId?: string }) {
  const [gazeData, setGazeData] = useState<GazeReportResult | null>(() =>
    loadLocalSessionGaze(sessionId),
  );
  const [loading, setLoading] = useState<boolean>(
    () =>
      Boolean(sessionId && sessionId !== "latest") &&
      !loadLocalSessionGaze(sessionId),
  );
  const [selectedSnapshot, setSelectedSnapshot] = useState<GazeEvent | null>(
    null,
  );
  const [filterMode, setFilterMode] = useState<"all" | "evidence">("all");

  useEffect(() => {
    let mounted = true;
    const local = loadLocalSessionGaze(sessionId);
    setGazeData(local);

    if (!sessionId || sessionId === "latest") {
      setLoading(false);
      return;
    }

    setLoading(!local);
    getSessionGazeReport(sessionId)
      .then((remote) => {
        if (!mounted) return;
        if (remote) {
          setGazeData(persistedGazeToReportResult(remote));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const hasCameraData = Boolean(
    gazeData && (gazeData.camera_active ?? gazeData.face_presence_pct > 0),
  );
  const presencePct = hasCameraData ? `${gazeData!.face_presence_pct}%` : "--";
  const straightPct = hasCameraData
    ? `${gazeData!.looking_straight_pct}%`
    : "--";
  const awayPct = hasCameraData ? `${gazeData!.looking_away_pct}%` : "--";
  const notDetectedPct = hasCameraData
    ? `${gazeData!.not_detected_pct}%`
    : "--";

  const integrity = hasCameraData ? gazeData?.integrity || null : null;
  const events: GazeEvent[] = hasCameraData ? gazeData?.events || [] : [];
  const evidenceCount = events.filter((e) => Boolean(e.snapshotUrl)).length;
  const displayedEvents =
    filterMode === "evidence"
      ? events.filter((e) => Boolean(e.snapshotUrl))
      : events;

  if (loading) {
    return (
      <Card className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
        Đang tải dữ liệu phân tích ánh mắt & độ trung thực...
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Integrity Rubric Scorecard */}
      {integrity && integrity.totalQuestionsScored > 0 && (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
            <div className="flex items-center justify-center lg:col-span-2">
              <div
                className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 ${rankCircleClasses(integrity.rank)}`}
              >
                <span className="text-2xl font-bold leading-none tabular-nums">
                  {integrity.overallScore}
                </span>
                <span className="mt-1 text-[11px] font-medium opacity-75">
                  / 100
                </span>
              </div>
            </div>

            <div className="space-y-2 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="m-0 text-base font-bold text-zinc-950">
                  Điểm độ trung thực phiên phỏng vấn
                </h3>
                <Badge
                  variant={rankBadgeVariant(integrity.rank)}
                  className="rounded-full text-xs"
                >
                  {getIntegrityRankMeta(integrity.rank).label}
                </Badge>
                {integrity.hasSecondPerson && (
                  <Badge variant="destructive" className="rounded-full text-xs">
                    <Users className="mr-1 h-3 w-3" /> Có người thứ hai
                  </Badge>
                )}
              </div>
              <p className="m-0 text-sm text-zinc-600">
                {getIntegrityRankMeta(integrity.rank).guidance}
              </p>
              <p className="m-0 text-xs text-zinc-500">
                {integrity.disclaimer || INTEGRITY_DISCLAIMER}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4 lg:col-span-3 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Số câu đã chấm
                </div>
                <div className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums">
                  {integrity.totalQuestionsScored} câu
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Phạt vi phạm (P_events)
                </div>
                <div className="mt-0.5 text-sm font-bold text-red-600 tabular-nums">
                  -{integrity.totalPEvents} điểm
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Phạt liếc ngắn (P_focus)
                </div>
                <div className="mt-0.5 text-sm font-bold text-amber-600 tabular-nums">
                  -{integrity.totalPFocus} điểm
                </div>
              </div>
            </div>
          </div>

          {integrity.hasSecondPerson && (
            <Alert variant="destructive" className="mt-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Hệ thống phát hiện có từ 2 khuôn mặt trong khung hình kéo dài từ
                1,5 giây trở lên — xếp hạng tự động hạ xuống mức <b>LOW</b> để
                HR ưu tiên kiểm tra lại mốc video bên dưới.
              </AlertDescription>
            </Alert>
          )}

          {/* Per-question rubric breakdown table */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-2.5">Câu hỏi</th>
                  <th className="px-4 py-2.5 text-right">Thời lượng</th>
                  <th className="px-4 py-2.5 text-right">Nhìn thẳng*</th>
                  <th className="px-4 py-2.5 text-right">P_events</th>
                  <th className="px-4 py-2.5 text-right">P_focus</th>
                  <th className="px-4 py-2.5 text-right">Điểm câu</th>
                  <th className="px-4 py-2.5 text-right">Xếp hạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {integrity.questions.map((q) => (
                  <tr key={q.questionIndex} className="hover:bg-zinc-50/70">
                    <td className="px-4 py-2.5 font-medium text-zinc-900">
                      Câu {q.questionIndex}
                      {q.hasSecondPerson && (
                        <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          <AlertTriangle className="h-2.5 w-2.5" /> 2 mặt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-600 tabular-nums">
                      {q.totalDurationSec}s
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-700 tabular-nums">
                      {Math.round(q.straightRatioOnUnpenalized * 100)}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600 tabular-nums">
                      {q.pEvents > 0 ? `-${q.pEvents}` : "0"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-amber-600 tabular-nums">
                      {q.pFocus > 0 ? `-${q.pFocus}` : "0"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-zinc-950 tabular-nums">
                      {q.score}/100
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge
                        variant={rankBadgeVariant(q.rank)}
                        className="rounded-full text-[10px]"
                      >
                        {q.rank}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="m-0 mt-2 text-[11px] text-zinc-400">
            * Tỷ lệ nhìn thẳng ở Bước 2 chỉ tính trên thời gian chưa bị phạt ở
            Bước 1 (tránh phạt 2 lần cùng một đoạn). Nếu dưới 80% sẽ phạt (0.80
            − tỷ lệ) × 50.
          </p>
        </Card>
      )}

      {/* Raw Gaze KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Khuôn mặt hiện diện"
          value={presencePct}
          icon={ScanFace}
        />
        <KpiCard label="Nhìn thẳng" value={straightPct} icon={Eye} />
        <KpiCard label="Nhìn lệch hướng" value={awayPct} icon={EyeOff} />
        <KpiCard label="Không nhận diện" value={notDetectedPct} icon={UserX} />
      </section>

      {/* Event Timeline */}
      <Card className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-4">
          <h3 className="m-0 text-base font-bold text-zinc-950">
            Dòng thời gian sự kiện hướng nhìn & vi phạm
          </h3>
          <p className="m-0 mt-1 text-xs text-zinc-500">
            {hasCameraData
              ? gazeData?.summary
              : "Không có dữ liệu camera được ghi nhận cho phiên phỏng vấn này."}
          </p>
        </div>

        {!hasCameraData ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400">
              <CameraOff className="h-5 w-5" />
            </div>
            <h4 className="m-0 text-sm font-semibold text-zinc-900">
              Chưa có dữ liệu phân tích ánh mắt
            </h4>
            <p className="m-0 mt-1.5 max-w-md text-xs leading-relaxed text-zinc-500">
              Phiên phỏng vấn này được thực hiện khi camera tắt, chưa được đồng
              bộ dữ liệu gaze lên máy chủ, hoặc trình duyệt không hỗ trợ
              MediaPipe FaceLandmarker.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-700">
                  Tổng số mốc gắn cờ:{" "}
                  <b className="text-emerald-700">{events.length}</b>
                </span>
                {evidenceCount > 0 && (
                  <Badge variant="warning" className="text-[11px]">
                    {evidenceCount} ảnh bằng chứng
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={filterMode === "all" ? "default" : "outline"}
                  className="h-7 rounded-lg text-xs"
                  onClick={() => setFilterMode("all")}
                >
                  Tất cả ({events.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filterMode === "evidence" ? "default" : "outline"}
                  className="h-7 rounded-lg text-xs"
                  onClick={() => setFilterMode("evidence")}
                >
                  Có ảnh chụp ({evidenceCount})
                </Button>
              </div>
            </div>

            {displayedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-10 text-center text-sm text-zinc-500">
                {events.length === 0
                  ? "Ứng viên duy trì hướng nhìn tập trung ổn định, không có mốc nào vượt ngưỡng phạt."
                  : "Không có sự kiện nào phù hợp với bộ lọc hiện tại."}
              </div>
            ) : (
              <div className="relative my-3 max-h-[490px] overflow-y-auto pl-8 pr-2">
                <div className="absolute bottom-3.5 left-[11px] top-3.5 w-0.5 bg-zinc-200" />
                {displayedEvents.map((x, i) => {
                  const isSevere =
                    x.type === "second_person" || x.type === "off_screen";
                  const isLookUp = x.behavior === "LOOK_UP";
                  const dotClass = isSevere
                    ? "bg-red-500 ring-red-200"
                    : isLookUp
                      ? "bg-sky-500 ring-sky-200"
                      : "bg-amber-500 ring-amber-200";
                  const behaviorLabel = x.behavior
                    ? INTEGRITY_RUBRIC.BEHAVIORS[x.behavior]?.label
                    : null;

                  return (
                    <div
                      key={`${x.timestamp}-${i}`}
                      className="relative mb-3.5 flex items-stretch"
                    >
                      <div
                        className={`absolute -left-[27px] top-4 z-[2] h-3.5 w-3.5 rounded-full border-2 border-white ring-2 ${dotClass}`}
                      />

                      <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-2xs transition-colors hover:border-zinc-300">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                              {x.timestamp}
                            </span>
                            {behaviorLabel && (
                              <Badge
                                variant={
                                  isSevere
                                    ? "destructive"
                                    : isLookUp
                                      ? "secondary"
                                      : "warning"
                                }
                                className="text-[11px]"
                              >
                                {behaviorLabel}
                              </Badge>
                            )}
                            {x.questionIndex && (
                              <Badge variant="outline" className="text-[11px]">
                                Câu {x.questionIndex}
                                {x.stage ? ` · ${x.stage.toUpperCase()}` : ""}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[11px]">
                              {x.duration}s
                            </Badge>
                            {typeof x.penalty === "number" && x.penalty > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-[11px] tabular-nums"
                              >
                                -{x.penalty}đ
                              </Badge>
                            )}
                          </div>
                          <p className="m-0 text-[13px] font-semibold leading-snug text-zinc-900">
                            {x.description}
                          </p>
                          {x.questionText && (
                            <p className="m-0 mt-1.5 rounded-lg border-l-2 border-emerald-500 bg-zinc-50 px-2.5 py-1.5 text-xs italic text-zinc-600">
                              <span className="not-italic font-semibold text-zinc-800">
                                Câu hỏi lúc đó:{" "}
                              </span>
                              "{x.questionText}"
                            </p>
                          )}
                        </div>

                        {x.snapshotUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedSnapshot(x)}
                            title="Bấm để phóng to bằng chứng"
                            className="group relative h-[60px] w-[90px] shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 p-0 cursor-pointer"
                          >
                            <img
                              src={x.snapshotUrl}
                              alt="Bằng chứng hướng nhìn"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/45 opacity-0 transition-opacity group-hover:opacity-100">
                              <Eye className="h-4 w-4 text-white" />
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 text-xs text-zinc-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <div className="font-semibold text-zinc-900">
              Lưu ý theo Rubric đánh giá độ trung thực
            </div>
            <p className="m-0 mt-0.5 leading-relaxed text-zinc-500">
              {INTEGRITY_DISCLAIMER}
            </p>
          </div>
        </div>
      </Card>

      <Dialog
        open={Boolean(selectedSnapshot)}
        onOpenChange={(open) => {
          if (!open) setSelectedSnapshot(null);
        }}
      >
        <DialogContent className="max-w-[740px] gap-0 overflow-hidden p-0">
          {selectedSnapshot && (
            <>
              <DialogHeader className="border-b border-zinc-200 px-6 py-4">
                <div className="flex items-center gap-3 pr-8">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-[15px]">
                      Ảnh chụp bằng chứng hướng nhìn
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span>
                        Thời điểm:{" "}
                        <b className="font-mono text-zinc-900">
                          {selectedSnapshot.timestamp}
                        </b>
                      </span>
                      <span>·</span>
                      <span>
                        Thời lượng:{" "}
                        <b className="text-zinc-900">
                          {selectedSnapshot.duration}s
                        </b>
                      </span>
                      {typeof selectedSnapshot.penalty === "number" &&
                        selectedSnapshot.penalty > 0 && (
                          <>
                            <span>·</span>
                            <Badge variant="destructive" className="text-[11px]">
                              -{selectedSnapshot.penalty} điểm
                            </Badge>
                          </>
                        )}
                      {selectedSnapshot.questionIndex && (
                        <>
                          <span>·</span>
                          <Badge variant="secondary" className="text-[11px]">
                            Câu {selectedSnapshot.questionIndex}
                            {selectedSnapshot.stage
                              ? ` · ${selectedSnapshot.stage.toUpperCase()}`
                              : ""}
                          </Badge>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex max-h-[60vh] min-h-[320px] items-center justify-center bg-zinc-950 p-4">
                {selectedSnapshot.snapshotUrl ? (
                  <img
                    src={selectedSnapshot.snapshotUrl}
                    alt="Bằng chứng vi phạm"
                    className="max-h-[56vh] max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="text-sm text-zinc-400">
                    Không có hình ảnh snapshot
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
                <div className="min-w-[220px] flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Hành vi ghi nhận
                  </div>
                  <p className="m-0 mt-1 text-sm font-medium text-zinc-900">
                    {selectedSnapshot.description}
                  </p>
                  {selectedSnapshot.questionText && (
                    <p className="m-0 mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs italic text-zinc-600">
                      <span className="not-italic font-semibold text-zinc-800">
                        Đang trong câu hỏi:{" "}
                      </span>
                      "{selectedSnapshot.questionText}"
                    </p>
                  )}
                </div>

                {selectedSnapshot.snapshotUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={selectedSnapshot.snapshotUrl}
                      download={`evidence-${selectedSnapshot.timestamp.replace(":", "-")}.jpg`}
                    >
                      <Download className="h-3.5 w-3.5" /> Tải ảnh
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
