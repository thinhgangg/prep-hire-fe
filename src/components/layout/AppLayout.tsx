import React, { useState } from "react";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AppSidebar, type SidebarRole } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

type AppLayoutProps = {
  role: SidebarRole;
  activeKey: string;
  onNavigate: (key: string) => void;
  wide?: boolean;
  children: React.ReactNode;
};

export function AppLayout({
  role,
  activeKey,
  onNavigate,
  wide = false,
  children,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-[#F8F9FA] text-zinc-950">
      <AppSidebar
        role={role}
        activeKey={activeKey}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[260px]">
        {/* Mobile Topbar */}
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo size="sm" />
          <div className="w-9" />
        </div>

        {/* Unified Main Content Canvas */}
        <main className="flex-1 w-full">
          <div
            className={cn(
              "mx-auto w-full max-w-[1280px] px-5 py-7 sm:px-8 lg:px-10 lg:py-8",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

