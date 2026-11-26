import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type GaugeSegment = {
  label: string;
  count: number;
  tone: "dark" | "emerald" | "striped";
};

type ScoreGaugeCardProps = {
  title: string;
  badgeLabel?: string;
  centerValue: string | number;
  centerLabel: string;
  /** When provided (0-100), renders a single clean semi-circle score arc out of 100 */
  scoreValue?: number | null;
  segments?: GaugeSegment[];
  competencies?: { label: string; score: number }[];
  emptyCompetencyText?: string;
};

const TONE_COLOR: Record<GaugeSegment["tone"], { stroke: string; dot: string }> =
  {
    emerald: { stroke: "#059669", dot: "bg-emerald-600" },
    dark: { stroke: "#18181b", dot: "bg-zinc-900" },
    striped: { stroke: "#d4d4d8", dot: "bg-zinc-300" },
  };

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngleDeg: number,
  endAngleDeg: number,
) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngleDeg));
  const y1 = cy + r * Math.sin(rad(startAngleDeg));
  const x2 = cx + r * Math.cos(rad(endAngleDeg));
  const y2 = cy + r * Math.sin(rad(endAngleDeg));
  const largeArc = Math.abs(endAngleDeg - startAngleDeg) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function ScoreGaugeCard({
  title,
  badgeLabel = "Thực tế",
  centerValue,
  centerLabel,
  scoreValue,
  segments = [],
  competencies,
  emptyCompetencyText,
}: ScoreGaugeCardProps) {
  const cx = 120;
  const cy = 114;
  const radius = 90;
  const strokeWidth = 18;
  const trackPath = describeArc(cx, cy, radius, 180, 360);

  const isScoreMode = scoreValue !== undefined;
  const clampedScore =
    typeof scoreValue === "number" && Number.isFinite(scoreValue)
      ? Math.max(0, Math.min(100, scoreValue))
      : 0;
  const scoreEndAngle = 180 + (clampedScore / 100) * 180;
  const scoreStrokeColor =
    clampedScore >= 75 ? "#059669" : clampedScore >= 50 ? "#18181b" : "#f59e0b";

  // Multi-segment mode (used for Admin distribution)
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const activeSegments = segments.filter((s) => s.count > 0);
  const gapDeg = activeSegments.length > 1 ? 3 : 0;
  const usableDeg = 180 - gapDeg * Math.max(0, activeSegments.length - 1);
  const rawWeights = activeSegments.map((s) => Math.max(0.05, s.count / total));
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);

  let cursor = 180;
  const arcs = !isScoreMode
    ? activeSegments.map((seg, idx) => {
        const span = (rawWeights[idx] / weightSum) * usableDeg;
        const start = cursor;
        const end = cursor + span;
        cursor = end + gapDeg;
        return {
          ...seg,
          path: describeArc(cx, cy, radius, start, end),
        };
      })
    : [];

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-[12px] font-medium text-zinc-600">
            {badgeLabel}
          </span>
        </div>

        {/* Clean Semi-Circle Arc Gauge */}
        <div className="relative mx-auto mt-5 flex w-full max-w-[240px] flex-col items-center">
          <svg
            viewBox="0 0 240 132"
            className="h-auto w-full"
            aria-hidden="true"
          >
            {/* Base track */}
            <path
              d={trackPath}
              fill="none"
              stroke="#f4f4f5"
              strokeWidth={strokeWidth}
              strokeLinecap={isScoreMode ? "round" : "butt"}
            />

            {isScoreMode ? (
              clampedScore > 0 && (
                <path
                  d={describeArc(cx, cy, radius, 180, Math.min(359.99, scoreEndAngle))}
                  fill="none"
                  stroke={scoreStrokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              )
            ) : (
              arcs.map((arc) => (
                <path
                  key={arc.label}
                  d={arc.path}
                  fill="none"
                  stroke={TONE_COLOR[arc.tone].stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                />
              ))
            )}
          </svg>

          <div className="pointer-events-none absolute bottom-1.5 flex flex-col items-center text-center">
            <span className="text-[12px] font-medium text-zinc-500">
              {centerLabel}
            </span>
            <div className="mt-0.5 flex items-baseline justify-center gap-0.5 tabular-nums">
              <span className="text-[32px] font-bold leading-none tracking-tight text-zinc-950">
                {centerValue}
              </span>
              {isScoreMode && clampedScore > 0 && (
                <span className="text-[13px] font-medium text-zinc-400">
                  /100
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Optional Multi-Segment Legend (Admin Distribution) */}
        {!isScoreMode && segments.length > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4">
            {segments.map((seg) => {
              const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
              return (
                <div
                  key={seg.label}
                  className="flex flex-col items-center rounded-xl bg-zinc-50/70 px-2 py-2 text-center"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${TONE_COLOR[seg.tone].dot}`}
                    />
                    <span className="truncate text-[11px] font-medium text-zinc-500">
                      {seg.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1 tabular-nums">
                    <span className="text-[15px] font-bold text-zinc-950">
                      {seg.count}
                    </span>
                    <span className="text-[11px] text-zinc-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Optional Competencies Breakdown for Candidate Dashboard */}
      {competencies && (
        <div className="mt-5 border-t border-zinc-100 pt-4">
          {competencies.length > 0 ? (
            <div className="space-y-3">
              {competencies.map((c) => (
                <div key={c.label}>
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-zinc-700">{c.label}</span>
                    <span className="font-semibold text-zinc-950 tabular-nums">
                      {c.score}/100
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, c.score))} />
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-3.5 py-3 text-center text-[12px] text-zinc-500">
              {emptyCompetencyText ||
                "Hoàn thành phiên phỏng vấn đầu tiên để xem phân tích 4 nhóm năng lực."}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
