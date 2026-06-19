"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Archive,
  Layers,
  Upload,
  Download,
  Users,
  HardDrive,
  UserCheck,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Tv2,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Archive Records", href: "/records", icon: Archive },
  { label: "Batches", href: "/batches", icon: Layers },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Export", href: "/export", icon: Download },
  { label: "Settings", href: "/settings", icon: Settings },
];
const adminItems = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Reporters", href: "/admin/reporters", icon: UserCheck },
  { label: "Drives", href: "/admin/drives", icon: HardDrive },
  { label: "Activity Log", href: "/admin/activity", icon: Activity },
];

function NavItem({ item, collapsed, onClick }) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
        active
          ? "bg-primary text-sidebarText"
          : "text-sidebarText hover:bg-sidebarHover hover:text-sidebarText"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
          {item.label}
        </div>
      )}
    </Link>
  );
}

export default function Sidebar({
  user,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const isAdmin = user?.role === "admin";

  const content = (
    <div className="flex flex-col h-full bg-sidebarBg ">
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-4 py-4 border-b border-divider ${collapsed ? "justify-center" : ""}`}
      >
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Tv2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sidebarText font-bold text-sm leading-tight">
              NAMS
            </p>
            <p className="text-textMuted text-xs">News Archive</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}
        {isAdmin && (
          <>
            <div className={`pt-3 pb-1 ${collapsed ? "px-1" : "px-3"}`}>
              {!collapsed && (
                <p className="text-xs font-semibold text-sidebarText uppercase tracking-wider">
                  Admin
                </p>
              )}
              {collapsed && <div className="border-t border-divider" />}
            </div>
            {adminItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </>
        )}
      </nav>

      {/* User info */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-divider">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sidebarText text-xs font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sidebarText text-xs font-medium truncate">
                {user?.username}
              </p>
              <p className="text-sidebarText text-xs capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:flex px-2 py-2 border-t border-divider">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-btnBg text-btnText  hover:bg-btnHover hover:text-btnText transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col sidebar transition-all duration-300 flex-shrink-0 ${collapsed ? "w-16" : "w-56"}`}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-dashboardBg/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 sidebar animate-slideIn flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-btnText bg-btnBg hover:bg-btnHover p-1.5 rounded-lg"
            >
              <X size={18} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
