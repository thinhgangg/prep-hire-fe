import React from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function getVietnameseDateEyebrow(date: Date = new Date()): string {
  return date
    .toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  backButton?: {
    onClick: () => void;
    label?: string;
  };
  showNotifications?: boolean;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  backButton,
  showNotifications = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-[32px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {backButton && (
          <button
            type="button"
            onClick={backButton.onClick}
            title={backButton.label || "Quay lại"}
            aria-label={backButton.label || "Quay lại"}
            className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {eyebrow}
            </p>
          )}
          <h1 className="m-0 text-[30px] font-bold leading-[1.3] tracking-[-0.02em] text-zinc-950">
            {title}
          </h1>
          {description && (
            <p className="m-0 mt-[6px] text-[14px] font-normal leading-[1.5] text-zinc-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {(showNotifications || action) && (
        <div className="flex shrink-0 items-center gap-2.5 sm:pt-1">
          {showNotifications && (
            <button
              type="button"
              aria-label="Thông báo"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
          )}
          {action}
        </div>
      )}
    </header>
  );
}

