import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from "@/services/adminApi";

export function getVietnameseDateEyebrow(date: Date = new Date()): string {
  return date
    .toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchList = () => {
    listNotifications().then((res) => {
      setItems(res.items || []);
      setUnreadCount(res.unread_count || 0);
      setLoaded(true);
    });
  };

  useEffect(() => {
    fetchList();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleOpenToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const handleItemClick = async (item: NotificationRecord) => {
    if (!item.is_read) {
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, is_read: true } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationRead(item.id);
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={handleOpenToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <span className="text-sm font-semibold text-zinc-950">
              Thông báo
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
            {!loaded ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                Đang tải thông báo...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                Chưa có thông báo mới.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-0 px-4 py-3 text-left transition-colors hover:bg-zinc-50 cursor-pointer",
                    item.is_read ? "bg-white" : "bg-emerald-50/40",
                  )}
                >
                  <Circle
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0",
                      item.is_read
                        ? "fill-zinc-200 text-zinc-200"
                        : "fill-emerald-600 text-emerald-600",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-zinc-900">
                      {item.title}
                    </div>
                    <p className="m-0 mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                      {item.message}
                    </p>
                    <div className="mt-1 text-[11px] text-zinc-400">
                      {new Date(item.created_at).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
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
  subtitle,
  description,
  actions,
  action,
  showNotifications = true,
  className,
}: PageHeaderProps) {
  const resolvedSubtitle = subtitle ?? description;
  const resolvedActions = actions ?? action;

  return (
    <header
      className={cn(
        "mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {eyebrow}
            </p>
          )}
          <h1 className="m-0 text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-zinc-950">
            {title}
          </h1>
          {resolvedSubtitle && (
            <p className="m-0 mt-1.5 text-[14px] font-normal leading-[1.5] text-zinc-500">
              {resolvedSubtitle}
            </p>
          )}
        </div>
      </div>

      {(showNotifications || resolvedActions) && (
        <div className="flex shrink-0 items-center gap-2.5 sm:pt-1">
          {showNotifications && <NotificationBell />}
          {resolvedActions}
        </div>
      )}
    </header>
  );
}
