import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreBadge, SectionHeader } from "@/components/shared";

export type SessionRowItem = {
  id: string;
  candidateName?: string;
  candidateInitials?: string;
  jobTitle: string;
  dateLabel: string;
  timestamp?: number;
  subMeta?: string;
  status: "completed" | "processing" | "low";
  statusLabel: string;
  score: number | null;
  onSelect: () => void;
};

type SortKey = "date" | "score";
type SortDir = "desc" | "asc";

type RecentSessionsCardProps = {
  title: string;
  rows: SessionRowItem[];
  showCandidateColumn?: boolean;
  searchPlaceholder?: string;
  onViewAll?: () => void;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  pageSize?: number;
  itemLabel?: string;
  enableSort?: boolean;
  enableStatusFilter?: boolean;
  showSearch?: boolean;
};

export function RecentSessionsCard({
  title,
  rows,
  showCandidateColumn = true,
  searchPlaceholder = "Tìm kiếm phiên phỏng vấn...",
  onViewAll,
  emptyMessage = "Chưa có phiên phỏng vấn nào được ghi nhận.",
  emptyAction,
  pageSize,
  itemLabel = "phiên phỏng vấn",
  enableSort = false,
  enableStatusFilter = false,
  showSearch = true,
}: RecentSessionsCardProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Tất cả");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const processed = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (enableStatusFilter && statusFilter !== "Tất cả") {
        if (r.statusLabel !== statusFilter) return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        r.jobTitle.toLowerCase().includes(q) ||
        (r.candidateName || "").toLowerCase().includes(q) ||
        r.statusLabel.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });

    if (!enableSort) return filtered;

    return [...filtered].sort((a, b) => {
      if (sortKey === "score") {
        const av = a.score ?? -1;
        const bv = b.score ?? -1;
        return sortDir === "desc" ? bv - av : av - bv;
      }
      const at = a.timestamp ?? 0;
      const bt = b.timestamp ?? 0;
      return sortDir === "desc" ? bt - at : at - bt;
    });
  }, [rows, query, statusFilter, enableStatusFilter, enableSort, sortKey, sortDir]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, sortKey, sortDir, rows.length]);

  const effectivePageSize = pageSize || processed.length || 1;
  const totalPages = Math.max(1, Math.ceil(processed.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);
  const displayedRows = pageSize
    ? processed.slice((safePage - 1) * pageSize, safePage * pageSize)
    : processed;

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-zinc-400" />;
    return sortDir === "desc" ? (
      <ArrowDown className="h-3 w-3 text-emerald-600" />
    ) : (
      <ArrowUp className="h-3 w-3 text-emerald-600" />
    );
  };

  const hasToolbarControls = enableSort || showSearch;

  return (
    <Card className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6">
      {hasToolbarControls ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
              {title}
            </h2>
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="inline-flex items-center gap-0.5 border-0 bg-transparent p-0 text-[12px] font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {enableSort && (
              <Select
                value={`${sortKey}-${sortDir}`}
                onValueChange={(val) => {
                  const [k, d] = val.split("-") as [SortKey, SortDir];
                  setSortKey(k);
                  setSortDir(d);
                }}
              >
                <SelectTrigger
                  aria-label="Sắp xếp danh sách"
                  className="h-9 w-[165px] rounded-full text-[12px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Mới nhất trước</SelectItem>
                  <SelectItem value="date-asc">Cũ nhất trước</SelectItem>
                  <SelectItem value="score-desc">Điểm cao → thấp</SelectItem>
                  <SelectItem value="score-asc">Điểm thấp → cao</SelectItem>
                </SelectContent>
              </Select>
            )}

            {showSearch && (
              <div className="relative w-full sm:w-[210px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 rounded-full border-zinc-200 pl-8 text-[13px]"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <SectionHeader
          title={title}
          actionLabel={onViewAll ? "Xem tất cả" : undefined}
          onAction={onViewAll}
        />
      )}

      {enableStatusFilter && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {["Tất cả", "Hoàn thành", "Chưa hoàn thành"].map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={
                  active
                    ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-white cursor-pointer transition-colors"
                    : "rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer transition-colors"
                }
              >
                {st}
              </button>
            );
          })}
        </div>
      )}

      {processed.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {showCandidateColumn && (
                <TableHead className="px-2 whitespace-nowrap">
                  Ứng viên
                </TableHead>
              )}
              <TableHead className="px-2 whitespace-nowrap">Vị trí</TableHead>
              <TableHead className="px-2 whitespace-nowrap">
                {enableSort ? (
                  <button
                    type="button"
                    onClick={() => toggleSort("date")}
                    className="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-medium text-inherit hover:text-zinc-950 cursor-pointer"
                  >
                    Ngày {renderSortIcon("date")}
                  </button>
                ) : (
                  "Ngày"
                )}
              </TableHead>
              <TableHead className="px-2 whitespace-nowrap">
                {enableSort ? (
                  <button
                    type="button"
                    onClick={() => toggleSort("score")}
                    className="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-medium text-inherit hover:text-zinc-950 cursor-pointer"
                  >
                    Điểm AI {renderSortIcon("score")}
                  </button>
                ) : (
                  "Điểm AI"
                )}
              </TableHead>
              <TableHead className="px-2 whitespace-nowrap">
                Trạng thái
              </TableHead>
              <TableHead className="px-2 text-right whitespace-nowrap" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((row) => (
              <TableRow
                key={row.id}
                onClick={row.onSelect}
                className="cursor-pointer"
              >
                {showCandidateColumn && (
                  <TableCell className="px-2 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-zinc-900 text-[10px] font-semibold text-white">
                          {row.candidateInitials || "UV"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[110px] truncate text-[13px] font-semibold text-zinc-950">
                        {row.candidateName || "Ứng viên"}
                      </div>
                    </div>
                  </TableCell>
                )}

                <TableCell className="px-2 py-3">
                  <div
                    className={
                      showCandidateColumn
                        ? "max-w-[190px] truncate text-[13px] font-medium text-zinc-900"
                        : "max-w-[260px] truncate text-[13px] font-medium text-zinc-900"
                    }
                    title={row.jobTitle}
                  >
                    {row.jobTitle}
                  </div>
                </TableCell>

                <TableCell className="px-2 py-3 text-[12px] text-zinc-500 whitespace-nowrap">
                  {row.dateLabel}
                </TableCell>

                <TableCell className="px-2 py-3 text-[13px] font-semibold tabular-nums whitespace-nowrap">
                  <ScoreBadge
                    score={row.score}
                    mode="inline"
                  />
                </TableCell>

                <TableCell className="px-2 py-3 whitespace-nowrap">
                  <Badge
                    variant={
                      row.status === "completed"
                        ? "success"
                        : row.status === "low"
                          ? "destructive"
                          : "warning"
                    }
                    className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px]"
                  >
                    {row.statusLabel}
                  </Badge>
                </TableCell>

                <TableCell className="px-2 py-3 text-right whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      row.onSelect();
                    }}
                    className="h-7 rounded-full px-2.5 text-[11px] whitespace-nowrap"
                  >
                    Chi tiết <ChevronRight className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
          <p className="m-0 text-[13px] text-zinc-500">
            {rows.length > 0
              ? `Không tìm thấy kết quả phù hợp`
              : emptyMessage}
          </p>
          {rows.length === 0 && emptyAction && (
            <Button size="sm" className="mt-3" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </div>
      )}

      {pageSize && processed.length > 0 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={processed.length}
          pageSize={pageSize}
          itemLabel={itemLabel}
          onPageChange={setCurrentPage}
          className="mt-4 rounded-none border-0 border-t border-zinc-100 bg-transparent px-0 pb-0 pt-4"
        />
      )}
    </Card>
  );
}
