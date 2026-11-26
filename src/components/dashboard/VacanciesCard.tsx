import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export type VacancyItem = {
  id: number | string;
  title: string;
  company: string;
  meta: string;
  matchPercentage?: number | null;
  actionLabel?: string;
  onAction: () => void;
};

type VacanciesCardProps = {
  title: string;
  items: VacancyItem[];
  onViewAll?: () => void;
  totalCount?: number;
  emptyMessage?: string;
};

export function VacanciesCard({
  title,
  items,
  onViewAll,
  emptyMessage = "Chưa có vị trí tuyển dụng nào.",
}: VacanciesCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-0.5 border-0 bg-transparent p-0 text-[12px] font-medium text-emerald-600 transition-colors hover:text-emerald-700 cursor-pointer"
            >
              Xem tất cả
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <div className="flex flex-1 flex-col divide-y divide-zinc-100">
            {items.map((item) => {
              const initials =
                item.company
                  .split(" ")
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "CT";

              return (
                <div
                  key={item.id}
                  onClick={item.onAction}
                  className="group flex cursor-pointer items-center justify-between gap-3 py-3 first:pt-1 last:pb-1 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-[11px] font-semibold text-zinc-700 transition-colors group-hover:border-zinc-300 group-hover:bg-zinc-100">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate text-[13px] font-semibold text-zinc-950 group-hover:text-emerald-700 transition-colors"
                        title={item.title}
                      >
                        {item.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-zinc-500">
                        <span className="truncate">{item.company}</span>
                        <span className="text-zinc-300">·</span>
                        <span className="shrink-0 truncate max-w-[90px]">
                          {item.meta.split("·")[0]?.trim()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center text-[13px] text-zinc-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </Card>
  );
}
