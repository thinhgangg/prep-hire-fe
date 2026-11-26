import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Video,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";
import { getAvatarInitials } from "@/utils/scoreMeta";

export type SidebarRole = "user" | "admin";

export type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  matchKeys?: string[];
};

export type MenuSection = {
  label: string;
  items: MenuItem[];
};

const USER_SECTIONS: MenuSection[] = [
  {
    label: "KHÔNG GIAN LÀM VIỆC",
    items: [
      { id: "/app", label: "Tổng quan", icon: LayoutDashboard },
      { id: "/app/jobs", label: "Công việc", icon: BriefcaseBusiness },
      { id: "/app/interviews/new", label: "Phỏng vấn", icon: Video },
      { id: "/app/results", label: "Kết quả của tôi", icon: BarChart3 },
    ],
  },
  {
    label: "QUẢN LÝ",
    items: [
      { id: "/app/settings", label: "Cài đặt", icon: Settings },
      { id: "/app/help", label: "Trung tâm hỗ trợ", icon: CircleHelp },
    ],
  },
];

const ADMIN_SECTIONS: MenuSection[] = [
  {
    label: "KHÔNG GIAN LÀM VIỆC",
    items: [
      { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { id: "jobs", label: "Công việc", icon: BriefcaseBusiness },
      {
        id: "interviews",
        label: "Phỏng vấn",
        icon: Video,
        matchKeys: [
          "interviews",
          "start",
          "analysis",
          "device",
          "room",
          "processing",
        ],
      },
      { id: "candidates", label: "Ứng viên", icon: Users },
      {
        id: "reports",
        label: "Báo cáo",
        icon: FileText,
        matchKeys: ["reports", "report"],
      },
    ],
  },
  {
    label: "QUẢN LÝ",
    items: [
      { id: "settings", label: "Cài đặt", icon: Settings },
      { id: "help", label: "Trung tâm hỗ trợ", icon: CircleHelp },
    ],
  },
];

type AppSidebarProps = {
  role: SidebarRole;
  activeKey: string;
  onNavigate: (key: string) => void;
  navSections?: MenuSection[];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export function AppSidebar({
  role,
  activeKey,
  onNavigate,
  navSections,
  mobileOpen = false,
  onCloseMobile,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const sections =
    navSections || (role === "admin" ? ADMIN_SECTIONS : USER_SECTIONS);

  const displayName =
    user?.name || (role === "admin" ? "Quản trị viên" : "Ứng viên");
  const roleSubtitle =
    role === "admin"
      ? user?.role === "RECRUITER"
        ? "Nhà tuyển dụng"
        : "Quản trị viên"
      : "Ứng viên";

  const initials = getAvatarInitials(
    displayName,
    role === "admin" ? "AD" : "UV",
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleLogoClick = () => {
    onNavigate(role === "admin" ? "dashboard" : "/app");
    onCloseMobile?.();
  };

  const handleSelect = (item: MenuItem) => {
    onNavigate(item.id);
    onCloseMobile?.();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-[#E4E4E7] bg-white transition-transform duration-200 ease-out lg:z-30 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Top Brand Area */}
        <div className="flex h-[72px] shrink-0 items-center justify-between px-[20px]">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center bg-transparent border-0 p-0 text-left cursor-pointer focus:outline-none"
          >
            <BrandLogo size="md" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-[20px] py-2">
          {sections.map((section, sectionIdx) => (
            <div
              key={section.label}
              className={sectionIdx > 0 ? "mt-6" : "mt-1"}
            >
              <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                {section.label}
              </div>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.matchKeys
                    ? item.matchKeys.includes(activeKey)
                    : activeKey === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "group flex h-[46px] w-full items-center gap-[12px] rounded-[10px] border-0 px-3 text-left text-[16px] font-medium leading-none transition-colors cursor-pointer",
                        isActive
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
                      )}
                    >
                      <Icon
                        size={19}
                        strokeWidth={isActive ? 2 : 1.75}
                        className={cn(
                          "h-[19px] w-[19px] shrink-0 transition-colors",
                          isActive
                            ? "text-emerald-600"
                            : "text-zinc-400 group-hover:text-zinc-700",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Unified Profile Footer */}
        <div className="shrink-0 border-t border-zinc-100 px-[20px] py-4">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight text-zinc-950">
                {displayName}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                {roleSubtitle}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
