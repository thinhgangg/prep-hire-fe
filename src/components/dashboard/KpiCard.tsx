import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiBadgeTone = "success" | "warning" | "destructive" | "neutral";

type KpiCardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeTone?: KpiBadgeTone;
  icon?: LucideIcon;
  onClick?: () => void;
  actionTitle?: string;
};

const BADGE_STYLES: Record<KpiBadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  warning: "bg-amber-50 text-amber-700 border-amber-200/70",
  destructive: "bg-red-50 text-red-700 border-red-200/70",
  neutral: "bg-zinc-100 text-zinc-600 border-zinc-200/80",
};

export function KpiCard({
  label,
  value,
  subtitle,
  badgeText,
  badgeTone = "neutral",
  icon: Icon,
  onClick,
  actionTitle,
}: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors",
        onClick && "cursor-pointer hover:border-zinc-300",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-zinc-500">
          {label}
        </span>
        <span
          title={actionTitle}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/70 text-zinc-600 transition-colors"
        >
          {Icon ? (
            <Icon className="h-4 w-4" />
          ) : onClick ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[28px] font-bold leading-none tracking-[-0.02em] text-zinc-950 tabular-nums">
            {value}
          </span>
          {badgeText && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight",
                BADGE_STYLES[badgeTone],
              )}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="m-0 mt-2 truncate text-[12px] text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
