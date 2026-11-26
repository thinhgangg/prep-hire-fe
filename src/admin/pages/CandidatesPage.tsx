import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Mail,
  Plus,
  Shield,
  Star,
  Users,
  X,
} from "lucide-react";
import type { Page } from "@/App";
import {
  AppShell,
  FilterToolbar,
  PageHeader,
  ScoreBadge,
  SearchInput,
  StatusBadge,
} from "@/components/shared";
import { useAuth } from "@/auth/AuthContext";
import type { UserRole } from "@/auth/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  type AdminUserRecord,
} from "@/services/adminApi";
import {
  getAllSessions,
  getSessionCandidateEmail,
  getSessionCandidateName,
  getSessionJobTitle,
  saveInterviewSession,
} from "@/services/interviewApi";
import { computeAiEvaluation } from "@/utils/aiEvaluation";
import { isSessionCompleted } from "@/utils/dashboardMetrics";
import { getAvatarInitials } from "@/utils/scoreMeta";

type Props = { go: (page: Page) => void };

export function CandidatesPage({ go }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"candidates" | "accounts">(
    "candidates",
  );
  const [search, setSearch] = useState("");
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
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin account management state
  const [accounts, setAccounts] = useState<AdminUserRecord[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountRoleFilter, setAccountRoleFilter] = useState<"ALL" | UserRole>(
    "ALL",
  );
  const [accountPage, setAccountPage] = useState(1);
  const accountPageSize = 8;
  const [createOpen, setCreateOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }>({ name: "", email: "", password: "", role: "RECRUITER" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const showNotice = (type: "ok" | "err", text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  useEffect(() => {
    const fetchUsersIfAdmin = isAdmin
      ? listAdminUsers({ limit: 200 })
          .then((r) => r.users || [])
          .catch(() => [] as AdminUserRecord[])
      : Promise.resolve([] as AdminUserRecord[]);

    Promise.all([getAllSessions(100, true), fetchUsersIfAdmin])
      .then(([res, userRows]) => {
        const usersById = new Map<number, AdminUserRecord>();
        userRows.forEach((u) => usersById.set(u.user_id_num, u));

        if (Array.isArray(res) && res.length > 0) {
          const map = new Map<string, any>();
          res.forEach((s) => {
            const dbUser =
              typeof s.user_id === "number"
                ? usersById.get(s.user_id)
                : undefined;
            const resolvedName =
              dbUser?.name?.trim() || getSessionCandidateName(s);
            const resolvedEmail =
              dbUser?.email?.trim() || getSessionCandidateEmail(s);

            // Skip orphan sessions that have neither user_id nor an identified candidate name
            if (s.user_id == null && resolvedName === "Chưa gắn tài khoản") {
              return;
            }

            const key =
              s.user_id != null
                ? `uid-${s.user_id}`
                : resolvedName.toLowerCase();
            const ep = (s as any).cv_profile_json || {};
            const rawSkills = [
              ...(ep.cv_skills || []).map((sk: any) =>
                typeof sk === "string" ? sk : sk?.name || "",
              ),
              ...(ep.technical_skills || []),
            ]
              .map((v: string) => v.trim())
              .filter(Boolean);
            const uniqueSkills = Array.from(new Set(rawSkills)).slice(0, 4);
            const completed = isSessionCompleted(s);
            const evalData = computeAiEvaluation(s);

            if (!map.has(key)) {
              map.set(key, {
                key,
                name: resolvedName,
                initial: getAvatarInitials(resolvedName, "UV"),
                role: getSessionJobTitle(s),
                skills: uniqueSkills,
                email: resolvedEmail,
                hasCompleted: completed,
                bestScore: completed ? evalData.overallScore : null,
                shortlisted: Boolean(s.review?.shortlisted),
                sessionCount: 1,
                session: s,
              });
            } else {
              const existing = map.get(key);
              existing.sessionCount += 1;
              if (s.review?.shortlisted) existing.shortlisted = true;
              if (existing.skills.length === 0 && uniqueSkills.length > 0) {
                existing.skills = uniqueSkills;
              }
              if (completed) {
                if (
                  !existing.hasCompleted ||
                  existing.bestScore === null ||
                  evalData.overallScore > existing.bestScore
                ) {
                  existing.hasCompleted = true;
                  existing.bestScore = evalData.overallScore;
                  existing.role = getSessionJobTitle(s);
                  existing.session = s;
                }
              }
            }
          });
          setCandidates(Array.from(map.values()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab !== "accounts" || !isAdmin) return;
    setLoadingAccounts(true);
    listAdminUsers({ search: accountSearch || undefined, limit: 150 })
      .then((res) => setAccounts(res.users || []))
      .catch((err: any) =>
        showNotice("err", err?.message || "Không thể tải danh sách tài khoản."),
      )
      .finally(() => setLoadingAccounts(false));
  }, [activeTab, isAdmin, accountSearch]);

  const handleChangeRole = async (
    target: AdminUserRecord,
    nextRole: UserRole,
  ) => {
    try {
      const updated = await updateAdminUserRole(target.user_id_num, nextRole);
      setAccounts((prev) =>
        prev.map((u) => (u.user_id_num === updated.user_id_num ? updated : u)),
      );
      showNotice(
        "ok",
        `Đã đổi quyền của ${updated.email} sang ${updated.role}.`,
      );
    } catch (err: any) {
      showNotice("err", err?.message || "Không thể thay đổi quyền tài khoản.");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const created = await createAdminUser(newUserForm);
      setAccounts((prev) => [created, ...prev]);
      setAccountPage(1);
      setCreateOpen(false);
      setNewUserForm({ name: "", email: "", password: "", role: "RECRUITER" });
      showNotice("ok", `Đã tạo tài khoản ${created.email} (${created.role}).`);
    } catch (err: any) {
      showNotice("err", err?.message || "Không thể tạo tài khoản mới.");
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (acc) => accountRoleFilter === "ALL" || acc.role === accountRoleFilter,
  );
  const accountTotalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / accountPageSize),
  );
  const safeAccountPage = Math.min(accountPage, accountTotalPages);
  const paginatedAccounts = filteredAccounts.slice(
    (safeAccountPage - 1) * accountPageSize,
    safeAccountPage * accountPageSize,
  );

  const filtered = candidates.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <AppShell
      role="admin"
      activeKey="candidates"
      onNavigate={(p) => go(p as Page)}
    >
      <PageHeader
        title="Ứng viên & Tài khoản"
        description="Theo dõi hồ sơ phỏng vấn, danh sách shortlist và phân quyền người dùng."
        action={
          isAdmin && activeTab === "accounts" ? (
            <Button size="lg" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Tạo tài khoản
            </Button>
          ) : undefined
        }
      />

      {notice && (
        <Alert
          variant={notice.type === "ok" ? "success" : "destructive"}
          className="mb-4"
        >
          {notice.type === "ok" ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}

      {isAdmin && (
        <div className="mb-5">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "candidates" | "accounts")}
          >
            <TabsList className="h-10 border border-zinc-200 bg-white p-1">
              <TabsTrigger value="candidates" className="px-4">
                Ứng viên phỏng vấn
              </TabsTrigger>
              <TabsTrigger value="accounts" className="px-4">
                <Shield className="mr-1.5 h-3.5 w-3.5" /> Quản lý tài khoản
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {activeTab === "candidates" ? (
        <>
          <FilterToolbar
            className="mb-5"
            left={
              <SearchInput
                placeholder="Tìm theo tên, email hoặc vị trí..."
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setCurrentPage(1);
                }}
                className="max-w-md"
              />
            }
            right={
              <span className="whitespace-nowrap text-xs font-medium text-zinc-500 tabular-nums">
                {filtered.length} hồ sơ
              </span>
            }
          />

          {loading ? (
            <Card className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
              Đang tải danh sách ứng viên...
            </Card>
          ) : paginated.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {paginated.map((p, i) => (
                  <Card
                    key={p.key || p.name + i}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-11 w-11 shrink-0">
                            <AvatarFallback className="bg-zinc-900 text-xs font-semibold text-white">
                              {p.initial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="m-0 truncate text-[15px] font-semibold text-zinc-950">
                                {p.name}
                              </h3>
                              {p.shortlisted && (
                                <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                              )}
                            </div>
                            <p className="m-0 mt-0.5 truncate text-[13px] text-zinc-500">
                              {p.role}
                            </p>
                          </div>
                        </div>
                        {p.hasCompleted && p.bestScore !== null && (
                          <ScoreBadge score={p.bestScore} mode="pill" />
                        )}
                      </div>

                      {p.skills.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {p.skills.map((x: string) => (
                            <Badge
                              key={x}
                              variant="secondary"
                              className="text-[11px]"
                            >
                              {x}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-zinc-500">
                        {p.email ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <span className="truncate">{p.email}</span>
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums">
                          {p.sessionCount} phiên
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                      <StatusBadge
                        status={p.hasCompleted ? "completed" : "incomplete"}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          saveInterviewSession(p.session);
                          navigate(`/admin/reports/${p.session.session_id}`, {
                            state: {
                              returnTo:
                                safePage > 1
                                  ? `/admin/candidates?page=${safePage}`
                                  : "/admin/candidates",
                            },
                          });
                        }}
                      >
                        Xem báo cáo <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                itemLabel="ứng viên"
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="m-0 text-[15px] font-semibold text-zinc-900">
                {search.trim()
                  ? "Không tìm thấy ứng viên phù hợp"
                  : "Chưa có hồ sơ ứng viên"}
              </h3>
              <p className="m-0 mt-1.5 max-w-md text-[13px] text-zinc-500">
                {search.trim()
                  ? `Không có hồ sơ nào khớp với "${search.trim()}".`
                  : "Hồ sơ ứng viên sẽ tự động hiển thị sau khi ứng viên tải lên CV và tham gia phỏng vấn."}
              </p>
              {search.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                >
                  Xóa từ khóa
                </Button>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 p-4">
            <FilterToolbar
              left={
                <SearchInput
                  placeholder="Tìm tài khoản theo tên hoặc email..."
                  value={accountSearch}
                  onChange={(v) => {
                    setAccountSearch(v);
                    setAccountPage(1);
                  }}
                  size="sm"
                  surface="muted"
                  className="max-w-sm"
                />
              }
              right={
                <>
                  <Select
                    value={accountRoleFilter}
                    onValueChange={(v) => {
                      setAccountRoleFilter(v as "ALL" | UserRole);
                      setAccountPage(1);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Lọc theo vai trò"
                      className="h-9 w-40 rounded-full bg-white text-xs"
                    >
                      <SelectValue placeholder="Tất cả vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                      <SelectItem value="CANDIDATE">CANDIDATE</SelectItem>
                      <SelectItem value="RECRUITER">RECRUITER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs font-medium text-zinc-500 tabular-nums">
                    {filteredAccounts.length} tài khoản
                  </span>
                </>
              }
            />
          </div>

          {loadingAccounts ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Đang tải danh sách tài khoản...
            </div>
          ) : paginatedAccounts.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Không có tài khoản nào phù hợp.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/70 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="whitespace-nowrap px-5 py-3">
                        Người dùng
                      </th>
                      <th className="whitespace-nowrap px-5 py-3">Email</th>
                      <th className="whitespace-nowrap px-5 py-3">
                        Vị trí / Khu vực
                      </th>
                      <th className="whitespace-nowrap px-5 py-3 text-right">
                        Vai trò
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedAccounts.map((acc) => {
                      const roleLoc = [acc.current_role, acc.location]
                        .map((v) => (v || "").trim())
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <tr
                          key={acc.user_id_num}
                          className="hover:bg-zinc-50/60"
                        >
                          <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900">
                            {acc.name}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-zinc-600">
                            {acc.email}
                          </td>
                          <td className="px-5 py-3 text-xs text-zinc-500">
                            {roleLoc || "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            <div className="inline-block w-36">
                              <Select
                                value={acc.role}
                                disabled={acc.user_id_num === user?.user_id_num}
                                onValueChange={(val) =>
                                  handleChangeRole(acc, val as UserRole)
                                }
                              >
                                <SelectTrigger className="h-8 bg-white text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CANDIDATE">
                                    CANDIDATE
                                  </SelectItem>
                                  <SelectItem value="RECRUITER">
                                    RECRUITER
                                  </SelectItem>
                                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={safeAccountPage}
                totalPages={accountTotalPages}
                totalItems={filteredAccounts.length}
                pageSize={accountPageSize}
                itemLabel="tài khoản"
                onPageChange={(p) => {
                  setAccountPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="mt-0 rounded-none border-0 border-t border-zinc-100 bg-transparent px-5 py-3.5"
              />
            </>
          )}
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản mới</DialogTitle>
            <DialogDescription>
              Chỉ Quản trị viên có quyền cấp tài khoản RECRUITER hoặc ADMIN.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nu-name">Họ và tên</Label>
              <Input
                id="nu-name"
                required
                value={newUserForm.name}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-email">Email</Label>
              <Input
                id="nu-email"
                type="email"
                required
                value={newUserForm.email}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-pw">Mật khẩu tạm (tối thiểu 6 ký tự)</Label>
              <Input
                id="nu-pw"
                type="password"
                minLength={6}
                required
                value={newUserForm.password}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vai trò</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(v) =>
                  setNewUserForm({ ...newUserForm, role: v as UserRole })
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CANDIDATE">CANDIDATE</SelectItem>
                  <SelectItem value="RECRUITER">RECRUITER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creatingUser}>
                {creatingUser ? "Đang tạo..." : "Tạo tài khoản"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
