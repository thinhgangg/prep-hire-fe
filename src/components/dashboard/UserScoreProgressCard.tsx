import { BarChart3, Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getScoreThresholdColor,
  type UserScoreChartPoint,
} from "@/utils/dashboardMetrics";

type UserScoreProgressCardProps = {
  title?: string;
  points: UserScoreChartPoint[];
  averageScore: number;
  summaryStats: { label: string; value: string | number }[];
  loading?: boolean;
  onSelectSession?: (sessionId: string) => void;
  onStartInterview?: () => void;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: { payload: UserScoreChartPoint }[];
};

function ScoreProgressTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  const scoreColor =
    item.score >= 80
      ? "text-emerald-600"
      : item.score >= 50
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="max-w-[260px] rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-zinc-900">
          Phiên {item.orderLabel}
          {item.isLatest ? " · Gần nhất" : ""}
        </span>
        <span className={`text-[14px] font-bold tabular-nums ${scoreColor}`}>
          {item.score}/100
        </span>
      </div>
      <div className="mt-1 truncate text-[12px] font-medium text-zinc-700">
        {item.jobTitle}
      </div>
      <div className="mt-1 text-[12px] text-zinc-500">{item.dateTimeLabel}</div>
    </div>
  );
}

export function UserScoreProgressCard({
  title = "Tiến độ điểm phỏng vấn",
  points,
  averageScore,
  summaryStats,
  loading = false,
  onSelectSession,
  onStartInterview,
}: UserScoreProgressCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700">
            Phiên đã hoàn thành
          </span>
        </div>

        {/* 3 Summary Stats */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-b border-zinc-100 pb-5">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <div className="truncate text-[12px] font-medium text-zinc-600">
                {stat.label}
              </div>
              <div className="mt-1 truncate text-[18px] font-bold tracking-tight text-zinc-950 tabular-nums">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ) : points.length > 0 ? (
        <div className="mt-5 flex flex-1 flex-col justify-between">
          <div className="h-[235px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={points}
                margin={{ top: 18, right: 54, left: -12, bottom: 4 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E4E4E7"
                />
                <XAxis
                  dataKey="orderLabel"
                  axisLine={{ stroke: "#E4E4E7" }}
                  tickLine={false}
                  tick={{ fill: "#3F3F46", fontSize: 12, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#3F3F46", fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: "#F4F4F5" }}
                  wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                  content={<ScoreProgressTooltip />}
                />
                {averageScore > 0 && (
                  <ReferenceLine
                    y={averageScore}
                    stroke="#18181B"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `TB ${averageScore}`,
                      position: "right",
                      fill: "#18181B",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                )}
                <Bar
                  dataKey="score"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={42}
                  onClick={(barData) => {
                    const sid = (barData as unknown as UserScoreChartPoint)
                      ?.sessionId;
                    if (sid && onSelectSession) onSelectSession(sid);
                  }}
                  style={{ cursor: onSelectSession ? "pointer" : "default" }}
                >
                  {points.map((entry) => (
                    <Cell
                      key={entry.sessionId}
                      fill={getScoreThresholdColor(entry.score, entry.isLatest)}
                      stroke={entry.isLatest ? "#09090B" : "none"}
                      strokeWidth={entry.isLatest ? 1.5 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Crisp Threshold Legend (>= 12px, dark text) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-100 pt-3.5 text-[12px] font-medium text-zinc-700">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                ≥ 80 (Tốt)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                50–79 (Khá)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                &lt; 50 (Cần cải thiện)
              </span>
            </div>
            {averageScore > 0 && (
              <span className="inline-flex items-center gap-1.5 text-zinc-800">
                <span className="inline-block w-4 border-t-2 border-dashed border-zinc-900" />
                Điểm TB: <b className="tabular-nums">{averageScore}</b>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="m-0 max-w-xs text-[13px] leading-relaxed text-zinc-600">
            Chưa có phiên phỏng vấn nào hoàn thành để hiển thị biểu đồ tiến độ.
          </p>
          {onStartInterview && (
            <Button size="sm" className="mt-4" onClick={onStartInterview}>
              <Plus /> Tạo phiên phỏng vấn
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

