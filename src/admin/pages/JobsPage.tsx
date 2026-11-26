import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Page } from "@/App";
import {
  AppShell,
  FilterToolbar,
  JobCard,
  PageHeader,
  SearchInput,
  StatusBadge,
} from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createManagedJob,
  deleteManagedJob,
  fetchRealJobs,
  getCachedRealJobs,
  listManagedJobs,
  updateManagedJob,
  type DbJob,
  type ManagedJobPayload,
} from "@/services/jobApi";

type Props = { go: (page: Page) => void };

const EMPTY_FORM: ManagedJobPayload = {
  title: "",
  company_name: "",
  location: "TP. Hồ Chí Minh",
  level: "mid",
  employment_type: "Full-time",
  description: "",
  status: "active",
};

export function JobsPage({ go }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobList, setJobList] = useState<DbJob[]>(() => getCachedRealJobs());
  const [loading, setLoading] = useState(
    () => getCachedRealJobs().length === 0,
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">(
    "all",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<DbJob | null>(null);
  const [form, setForm] = useState<ManagedJobPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const currentPage = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10) || 1,
  );
  const setCurrentPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: false });
  };
  const pageSize = 9;

  const loadJobs = async () => {
    try {
      const managed = await listManagedJobs(150);
      setJobList(managed);
    } catch {
      const fallback = await fetchRealJobs(true);
      setJobList(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const showNotice = (type: "ok" | "err", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const openCreateModal = () => {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditModal = (job: DbJob) => {
    setEditingJob(job);
    setForm({
      title: job.title,
      company_name: job.company,
      location: job.location,
      level: job.level || "mid",
      employment_type: job.employment_type || "Full-time",
      description: "",
      status: job.status || "active",
    });
    setDialogOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingJob) {
        const patch: Partial<ManagedJobPayload> = {
          title: form.title,
          company_name: form.company_name,
          location: form.location,
          level: form.level,
          employment_type: form.employment_type,
          status: form.status,
        };
        if (form.description.trim().length >= 10) {
          patch.description = form.description.trim();
        }
        const updated = await updateManagedJob(editingJob.id, patch);
        setJobList((prev) =>
          prev.map((x) => (x.id === updated.id ? updated : x)),
        );
        showNotice("ok", `Đã cập nhật vị trí "${updated.title}".`);
      } else {
        const created = await createManagedJob({
          ...form,
          description:
            form.description.trim().length >= 20
              ? form.description.trim()
              : `Mô tả công việc cho vị trí ${form.title} tại ${form.company_name}.`,
        });
        setJobList((prev) => [created, ...prev]);
        showNotice("ok", `Đã tạo vị trí mới "${created.title}".`);
      }
      setDialogOpen(false);
    } catch (err: any) {
      showNotice("err", err?.message || "Không thể lưu vị trí tuyển dụng.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (job: DbJob) => {
    const nextStatus = job.status === "closed" ? "active" : "closed";
    try {
      const updated = await updateManagedJob(job.id, { status: nextStatus });
      setJobList((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      );
      showNotice(
        "ok",
        nextStatus === "active"
          ? `Đã mở lại vị trí "${job.title}".`
          : `Đã đóng vị trí "${job.title}".`,
      );
    } catch (err: any) {
      showNotice("err", err?.message || "Không thể đổi trạng thái.");
    }
  };

  const handleDeleteJob = async (job: DbJob) => {
    if (!window.confirm(`Xóa vị trí "${job.title}" khỏi hệ thống?`)) return;
    try {
      await deleteManagedJob(job.id);
      setJobList((prev) => prev.filter((x) => x.id !== job.id));
      showNotice("ok", `Đã xóa vị trí "${job.title}".`);
    } catch (err: any) {
      showNotice("err", err?.message || "Không thể xóa vị trí này.");
    }
  };

  const filtered = jobList.filter((j) => {
    const matchesSearch =
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.company.toLowerCase().includes(query.toLowerCase()) ||
      j.location.toLowerCase().includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || (j.status || "active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <AppShell
      role="admin"
      activeKey="jobs"
      onNavigate={(p) => go(p as Page)}
    >
      <PageHeader
        title="Quản lý công việc"
        description="Tạo, chỉnh sửa, đóng/mở và quản trị các vị trí tuyển dụng."
        action={
          <Button size="lg" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Tạo vị trí mới
          </Button>
        }
      />

      {feedback && (
        <Alert
          variant={feedback.type === "ok" ? "success" : "destructive"}
          className="mb-4"
        >
          {feedback.type === "ok" ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <AlertDescription>{feedback.text}</AlertDescription>
        </Alert>
      )}

      <FilterToolbar
        className="mb-5"
        left={
          <SearchInput
            placeholder="Tìm kiếm công việc, công ty hoặc địa điểm..."
            value={query}
            onChange={(v) => {
              setQuery(v);
              setCurrentPage(1);
            }}
            className="max-w-md"
          />
        }
        right={
          <>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "all" | "active" | "closed");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-40 rounded-full bg-white text-xs">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang mở</SelectItem>
                <SelectItem value="closed">Đã đóng</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs font-medium text-zinc-500 tabular-nums">
              {filtered.length} vị trí
            </span>
          </>
        }
      />

      {loading ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Đang tải danh sách công việc...
        </Card>
      ) : paginated.length === 0 ? (
        <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Không tìm thấy vị trí tuyển dụng nào phù hợp.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((j) => {
              const isClosed = j.status === "closed";

              return (
                <JobCard
                  key={j.id}
                  title={j.title}
                  company={j.company}
                  location={j.location}
                  level={j.level}
                  skills={j.skills}
                  footer={
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(j)}
                        title="Nhấn để chuyển trạng thái Mở / Đóng"
                        className="border-0 bg-transparent p-0 cursor-pointer"
                      >
                        <StatusBadge status={isClosed ? "closed" : "open"} />
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-950"
                          onClick={() => openEditModal(j)}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600"
                          onClick={() => handleDeleteJob(j)}
                          title="Xóa vị trí"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  }
                />
              );
            })}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            itemLabel="vị trí tuyển dụng"
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? "Chỉnh sửa vị trí tuyển dụng" : "Tạo vị trí tuyển dụng mới"}
            </DialogTitle>
            <DialogDescription>
              Thông tin sẽ được lưu trực tiếp vào cơ sở dữ liệu PostgreSQL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveJob} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Tên vị trí</Label>
              <Input
                id="job-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="VD: Senior Backend Engineer (Python/FastAPI)"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="job-company">Công ty</Label>
                <Input
                  id="job-company"
                  required
                  value={form.company_name}
                  onChange={(e) =>
                    setForm({ ...form, company_name: e.target.value })
                  }
                  placeholder="VD: PrepHire Tech"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job-loc">Địa điểm</Label>
                <Input
                  id="job-loc"
                  value={form.location || ""}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="TP. Hồ Chí Minh / Hà Nội"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cấp bậc</Label>
                <Select
                  value={form.level || "mid"}
                  onValueChange={(v) => setForm({ ...form, level: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Middle</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select
                  value={form.status || "active"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      status: v as "active" | "closed" | "draft",
                    })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang mở</SelectItem>
                    <SelectItem value="draft">Bản nháp</SelectItem>
                    <SelectItem value="closed">Đã đóng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-desc">
                Mô tả công việc (JD) {editingJob ? "(bỏ trống nếu giữ nguyên)" : ""}
              </Label>
              <textarea
                id="job-desc"
                rows={4}
                required={!editingJob}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Nhập yêu cầu công việc, kỹ năng chuyên môn, trách nhiệm..."
                className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Đang lưu..."
                  : editingJob
                    ? "Lưu thay đổi"
                    : "Tạo vị trí"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
