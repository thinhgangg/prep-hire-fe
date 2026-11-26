import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type UnifiedStatus =
  | "completed"
  | "incomplete"
  | "open"
  | "closed"
  | "high"
  | "medium"
  | "low";

const STATUS_CONFIG: Record<
  UnifiedStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  completed: { label: "Hoàn thành", variant: "success" },
  incomplete: { label: "Chưa hoàn thành", variant: "warning" },
  open: { label: "Đang mở", variant: "success" },
  closed: { label: "Đã đóng", variant: "secondary" },
  high: { label: "Phù hợp cao", variant: "success" },
  medium: { label: "Cần xem xét", variant: "warning" },
  low: { label: "Chưa phù hợp", variant: "destructive" },
};

type StatusBadgeProps = {
  status: UnifiedStatus;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge
      variant={cfg.variant}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px]",
        className,
      )}
    >
      {label || cfg.label}
    </Badge>
  );
}

