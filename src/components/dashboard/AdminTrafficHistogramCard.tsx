import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DailyVolumePoint,
  ScoreHistogramBin,
} from "@/utils/dashboardMetrics";

type AdminTrafficHistogramCardProps = {
  mode: "daily" | "scores";
  onModeChange: (mode: "daily" | "scores") => void;
  dailyData: DailyVolumePoint[];
  histogramData: ScoreHistogramBin[];
  summaryStats: { label: string; value: string | number }[];
  loading?: boolean;
  onSelectDate?: (isoDate: string) => void;
};

type DailyTooltipProps = {
  active?: boolean;
  payload?: { payload: DailyVolumePoint }[];
};

function DailyVolumeTooltip({ active, payload }: DailyTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="text-[12px] font-semibold text-zinc-900">
        {item.fullDateLabel}
      </div>
      <div className="mt-1.5 space-y-1 text-[12px]">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-zinc-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Hoàn thành
          </span>
          <b className="text-zinc-950 tabular-nums">{item.completed}</b>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-zinc-600">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            Chưa hoàn thành
          </span>
          <b className="text-zinc-950 tabular-nums">{item.incomplete}</b>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-1 font-semibold text-zinc-900">
          <span>Tổng cộng</span>
          <span className="tabular-nums">{item.total} phiên</span>
        </div>
      </div>
    </div>
  );
}

type HistogramTooltipProps = {
  active?: boolean;
  payload?: { payload: ScoreHistogramBin }[];
};

function HistogramTooltip({ active, payload }: HistogramTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="text-[12px] font-semibold text-zinc-900">
        Khoảng điểm {item.range}
      </div>
      <div className="mt-1 text-[13px] font-bold text-zinc-950 tabular-nums">
        {item.count} phiên{" "}
        <span className="font-normal text-zinc-500">({item.percentage}%)</span>
      </div>
    </div>
  );
}

export function AdminTrafficHistogramCard({
  mode,
  onModeChange,
  dailyData,
  histogramData,
  summaryStats,
  loading = false,
  onSelectDate,
}: AdminTrafficHistogramCardProps) {
  const hasDailyData = dailyData.length > 0;
  const hasHistogramData = histogramData.some((b) => b.count > 0);
  const hasData = mode === "daily" ? hasDailyData : hasHistogramData;

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
            {mode === "daily"
              ? "Lưu lượng phỏng vấn theo ngày"
              : "Phân bố điểm AI (Histogram)"}
          </h2>

          <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => onModeChange("daily")}
              className={
                mode === "daily"
                  ? "rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-zinc-950 shadow-xs border-0 cursor-pointer"
                  : "rounded-full bg-transparent px-3 py-1 text-[12px] font-medium text-zinc-600 hover:text-zinc-950 border-0 cursor-pointer"
              }
            >
              Theo ngày
            </button>
            <button
              type="button"
              onClick={() => onModeChange("scores")}
              className={
                mode === "scores"
                  ? "rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-zinc-950 shadow-xs border-0 cursor-pointer"
                  : "rounded-full bg-transparent px-3 py-1 text-[12px] font-medium text-zinc-600 hover:text-zinc-950 border-0 cursor-pointer"
              }
            >
              Điểm AI
            </button>
          </div>
        </div>

        {/* 3 Mini Summary Stats */}
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
          <Skeleton className="h-[230px] w-full rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ) : hasData ? (
        <div className="mt-5 flex flex-1 flex-col justify-between">
          <div className="h-[235px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {mode === "daily" ? (
                <BarChart
                  data={dailyData}
                  margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E4E4E7"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={{ stroke: "#E4E4E7" }}
                    tickLine={false}
                    tick={{ fill: "#3F3F46", fontSize: 12, fontWeight: 500 }}
                    dy={6}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#3F3F46", fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F4F4F5" }}
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={<DailyVolumeTooltip />}
                  />
                  <Bar
                    dataKey="completed"
                    name="Hoàn thành"
                    stackId="sessions"
                    fill="#059669"
                    maxBarSize={36}
                    radius={[0, 0, 0, 0]}
                    onClick={(barData) => {
                      const iso = (barData as unknown as DailyVolumePoint)
                        ?.isoDate;
                      if (iso && onSelectDate) onSelectDate(iso);
                    }}
                    style={{ cursor: onSelectDate ? "pointer" : "default" }}
                  />
                  <Bar
                    dataKey="incomplete"
                    name="Chưa hoàn thành"
                    stackId="sessions"
                    fill="#D4D4D8"
                    maxBarSize={36}
                    radius={[6, 6, 0, 0]}
                    onClick={(barData) => {
                      const iso = (barData as unknown as DailyVolumePoint)
                        ?.isoDate;
                      if (iso && onSelectDate) onSelectDate(iso);
                    }}
                    style={{ cursor: onSelectDate ? "pointer" : "default" }}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={histogramData}
                  margin={{ top: 12, right: 12, left: -16, bottom: 4 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E4E4E7"
                  />
                  <XAxis
                    dataKey="range"
                    axisLine={{ stroke: "#E4E4E7" }}
                    tickLine={false}
                    tick={{ fill: "#3F3F46", fontSize: 12, fontWeight: 500 }}
                    dy={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#3F3F46", fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#F4F4F5" }}
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={<HistogramTooltip />}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={52}>
                    {histogramData.map((bin) => (
                      <Cell key={bin.range} fill={bin.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend (>= 12px, darker zinc-700) */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3.5 text-[12px] font-medium text-zinc-700">
            {mode === "daily" ? (
              <>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-emerald-600" />
                    Hoàn thành
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-zinc-300" />
                    Chưa hoàn thành
                  </span>
                </div>
                <span className="text-zinc-500">
                  Nhấn cột ngày để lọc nhanh
                </span>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-red-500" />
                  0–40 (Thấp)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-amber-500" />
                  40–60 (Trung bình)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-emerald-600" />
                  60–100 (Tốt / Xuất sắc)
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="m-0 max-w-xs text-[13px] leading-relaxed text-zinc-600">
            Không có dữ liệu phiên phỏng vấn trong khoảng thời gian đã chọn.
          </p>
        </div>
      )}
    </Card>
  );
}

