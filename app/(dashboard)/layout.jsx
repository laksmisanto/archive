"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Spinner from "@/components/ui/Spinner";

const titles = {
  "/dashboard": "Dashboard",
  "/records": "Archive Records",
  "/records/new": "New Record",
  "/batches": "Batches",
  "/import": "Import Data",
  "/export": "Export Data",
  "/settings": "Settings",
  "/admin/users": "User Management",
  "/admin/reporters": "Reporters",
  "/admin/drives": "Drives",
  "/admin/activity": "Activity Log",
};

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.user) setUser(data.data.user);
        else router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, []);

  const title =
    titles[pathname] ||
    (pathname.includes("/edit")
      ? "Edit Record"
      : pathname.includes("/records/")
        ? "Record Detail"
        : pathname.includes("/batches/")
          ? "Batch Detail"
          : "NAMS");

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-dashboardBg">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-3" />
          <p className="text-textMuted text-sm">Loading NAMS...</p>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={user}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar user={user} title={title} setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-dashboardBg">
          {children}
        </main>
      </div>
    </div>
  );
}
