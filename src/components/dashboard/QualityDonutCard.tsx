import { PieChart as PieChartIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QualityDonutSegment } from "@/utils/dashboardMetrics";

type QualityDonutCardProps = {
  title?: string;
  badgeLabel?: string;
  totalScored: number;
  segments: QualityDonutSegment[];
  loading?: boolean;
};

type DonutTooltipProps = {
  active?: boolean;
  payload?: { payload: QualityDonutSegment }[];
};

function QualityDonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-zinc-900">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.color }}
        />
        {item.name}
      </div>
      <div className="mt-1 text-[13px] font-bold text-zinc-950 tabular-nums">
        {item.count} phiên{" "}
        <span className="font-normal text-zinc-500">({item.percentage}%)</span>
      </div>
    </div>
  );
}

export function QualityDonutCard({
  title = "Phân bổ chất lượng",
  badgeLabel = "Toàn thời gian",
  totalScored,
  segments,
  loading = false,
}: QualityDonutCardProps) {
  const activeSlices = segments.filter((s) => s.count > 0);

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700">
          {badgeLabel}
        </span>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-5">
          <Skeleton className="h-[180px] w-[180px] rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      ) : totalScored > 0 ? (
        <div className="mt-4 flex flex-1 flex-col justify-between">
          {/* Donut Chart with Center Label */}
          <div className="relative mx-auto h-[210px] w-full max-w-[240px]">
            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
              <span className="text-[28px] font-bold leading-none tracking-tight text-zinc-950 tabular-nums">
                {totalScored}
              </span>
              <span className="mt-1 text-[12px] font-medium text-zinc-600">
                phiên đã chấm
              </span>
            </div>

            <div className="relative z-10 h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeSlices}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={90}
                    paddingAngle={activeSlices.length > 1 ? 3 : 0}
                    stroke="none"
                  >
                    {activeSlices.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={<QualityDonutTooltip />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Crisp Legend with Count & Percentage (>= 12px, dark text) */}
          <div className="mt-4 space-y-2.5 border-t border-zinc-100 pt-4">
            {segments.map((seg) => (
              <div
                key={seg.name}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-medium text-zinc-800">{seg.name}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-semibold text-zinc-950">
                    {seg.count} phiên
                  </span>
                  <span className="min-w-[40px] text-right text-[12px] font-medium text-zinc-500">
                    ({seg.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
            <PieChartIcon className="h-5 w-5" />
          </div>
          <p className="m-0 max-w-xs text-[13px] leading-relaxed text-zinc-600">
            Chưa có phiên nào được chấm điểm trong khoảng thời gian đã chọn.
          </p>
        </div>
      )}
    </Card>
  );
}

