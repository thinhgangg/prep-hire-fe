import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  icon: Icon,
  iconClassName,
  actionLabel,
  onAction,
  right,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <Icon className={cn("h-4 w-4 shrink-0 text-zinc-600", iconClassName)} />
        )}
        <h2 className="m-0 truncate text-[16px] font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
      </div>

      {right ? (
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap border-0 bg-transparent p-0 text-[12px] font-medium text-emerald-600 transition-colors hover:text-emerald-700 cursor-pointer"
        >
          {actionLabel} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

type FilterToolbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function FilterToolbar({ left, right, className }: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      {left && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          {left}
        </div>
      )}
      {right && (
        <div className="flex flex-wrap items-center gap-2.5">{right}</div>
      )}
    </div>
  );
}

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
  surface?: "white" | "muted";
  ariaLabel?: string;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  size = "md",
  surface = "white",
  ariaLabel,
  className,
}: SearchInputProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-full border border-zinc-200 px-3.5 transition-colors hover:border-zinc-300 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/10",
        size === "sm" ? "h-9" : "h-10 shadow-2xs",
        surface === "muted"
          ? "bg-zinc-50 focus-within:bg-white"
          : "bg-white",
        className,
      )}
    >
      <Search
        className="h-4 w-4 shrink-0 text-zinc-400"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Xóa từ khóa tìm kiếm"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

