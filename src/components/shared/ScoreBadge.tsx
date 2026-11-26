import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getScoreMeta } from "@/utils/scoreMeta";

type ScoreBadgeProps = {
  score: number | null | undefined;
  /** "pill" renders a colored badge; "inline" renders tabular score text */
  mode?: "pill" | "inline";
  /** "candidate" -> Tốt/Khá/Cần cải thiện; "hr" -> Phù hợp cao/Cần xem xét/Chưa phù hợp */
  context?: "candidate" | "hr";
  /** When mode="pill", choose whether to display numeric score, label, or both */
  display?: "score" | "label" | "both";
  /** Optional prefix before numeric score, e.g. "TB " -> "TB 74/100" */
  prefix?: string;
  className?: string;
};

export function ScoreBadge({
  score,
  mode = "pill",
  context = "candidate",
  display = "score",
  prefix = "",
  className,
}: ScoreBadgeProps) {
  const meta = getScoreMeta(score);

  if (score === null || score === undefined || !Number.isFinite(score)) {
    return (
      <span
        aria-label="Chưa có điểm"
        className={cn("text-zinc-400 tabular-nums", className)}
      >
        —
      </span>
    );
  }

  const textLabel = context === "hr" ? meta.hrLabel : meta.label;

  if (mode === "inline") {
    return (
      <span className={cn("inline-flex items-baseline tabular-nums", className)}>
        <span className={cn("font-semibold", meta.textClass)}>{score}</span>
        <span className="text-[11px] font-normal text-zinc-400">/100</span>
      </span>
    );
  }

  return (
    <Badge
      variant={meta.badgeVariant}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full tabular-nums",
        className,
      )}
    >
      {display === "label"
        ? textLabel
        : display === "both"
          ? `${prefix}${score}/100 · ${textLabel}`
          : `${prefix}${score}/100`}
    </Badge>
  );
}

