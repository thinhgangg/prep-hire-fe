import React from "react";
import { BarChart3, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BarChartPoint = {
  id: string;
  label: string;
  value: number;
  highlight?: boolean;
  tooltip?: string;
  onSelect?: () => void;
};

type ScoreBarChartCardProps = {
  title: string;
  periodLabel?: string;
  headerRight?: React.ReactNode;
  summaryStats: { label: string; value: string | number }[];
  data: BarChartPoint[];
  autoScale?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
};

export function ScoreBarChartCard({
  title,
  periodLabel = "Gần đây",
  headerRight,
  summaryStats,
  data,
  autoScale = false,
  emptyMessage = "Chưa có dữ liệu phiên phỏng vấn để hiển thị biểu đồ.",
  emptyAction,
}: ScoreBarChartCardProps) {
  const rawMax = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;
  const maxVal = autoScale
    ? Math.max(4, Math.ceil(rawMax / 4) * 4)
    : 100;

  const ticks = [
    maxVal,
    Math.round(maxVal * 0.75),
    Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.25),
    0,
  ];

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          {headerRight ? (
            headerRight
          ) : (
            <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-[12px] font-medium text-zinc-600">
              {periodLabel}
            </span>
          )}
        </div>

        {/* 3 Mini Summary Stats */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-b border-zinc-100 pb-5">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <div className="truncate text-[12px] font-medium text-zinc-500">
                {stat.label}
              </div>
              <div className="mt-1 truncate text-[18px] font-bold tracking-tight text-zinc-950 tabular-nums">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crisp Flat Editorial Bar Chart (default bg-zinc-200, hover bg-emerald-600) */}
      {data.length > 0 ? (
        <div className="mt-6 flex flex-1 flex-col justify-end">
          <div className="relative flex h-[220px] items-end pl-9">
            {/* Y-axis reference labels */}
            <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col justify-between pb-7 pt-5 text-[11px] font-medium text-zinc-400 tabular-nums">
              {ticks.map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>

            {/* Subtle horizontal grid lines */}
            <div className="pointer-events-none absolute inset-x-0 inset-y-0 left-9 flex flex-col justify-between pb-7 pt-5">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-full border-t",
                    idx === 4
                      ? "border-zinc-200"
                      : "border-dashed border-zinc-100",
                  )}
                />
              ))}
            </div>

            {/* Vertical Flat Bars */}
            <div className="relative z-10 flex h-full w-full items-end justify-around gap-1.5 sm:gap-3">
              {data.map((item) => {
                const clamped = Math.max(0, Math.min(maxVal, item.value));
                const heightPx =
                  clamped > 0
                    ? Math.max(10, Math.round((clamped / maxVal) * 168))
                    : 4;
                const clickable = Boolean(item.onSelect);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!clickable}
                    onClick={item.onSelect}
                    className={cn(
                      "group flex h-full max-w-[58px] flex-1 flex-col items-center justify-end border-0 bg-transparent p-0 focus:outline-none",
                      clickable ? "cursor-pointer" : "cursor-default",
                    )}
                    title={
                      item.tooltip ||
                      `${item.label}: ${item.value}${autoScale ? " phiên" : "/100"}`
                    }
                  >
                    <div className="flex h-[192px] w-full flex-col items-center justify-end">
                      <span
                        className={cn(
                          "mb-1.5 text-[11px] font-semibold leading-none tabular-nums transition-colors duration-200",
                          clamped > 0
                            ? "text-zinc-600 group-hover:text-emerald-600"
                            : "text-zinc-300",
                        )}
                      >
                        {clamped > 0 ? item.value : "—"}
                      </span>
                      <div
                        className={cn(
                          "w-full max-w-[36px] rounded-t-lg transition-colors duration-200",
                          clamped > 0
                            ? "bg-zinc-200 group-hover:bg-emerald-600"
                            : "rounded-full bg-zinc-200/60 group-hover:bg-zinc-300",
                        )}
                        style={{ height: `${heightPx}px` }}
                      />
                    </div>
                    <span className="mt-2.5 max-w-full truncate text-[11px] font-medium text-zinc-500 group-hover:text-zinc-900 transition-colors">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex min-h-[210px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="m-0 max-w-xs text-[13px] leading-relaxed text-zinc-500">
            {emptyMessage}
          </p>
          {emptyAction && (
            <Button
              size="sm"
              className="mt-4"
              onClick={emptyAction.onClick}
            >
              <Plus /> {emptyAction.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
