"use client";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Bell } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

export default function Topbar({ user, title, setMobileOpen }) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-4 bg-cardBg border-b border-divider shadow-sm">
      <button
        onClick={() => setMobileOpen((prev) => !prev)}
        className="lg:hidden p-2 rounded-lg hover:bg-cardHover text-textMuted"
      >
        <Menu size={20} />
      </button>
      <h1 className="flex-1 text-base font-semibold text-textPrimary truncate">
        {title}
      </h1>
      <div className="flex items-center gap-1">
        <ThemeToggle size="sm" />
        <div className="flex items-center gap-6 pl-2 border-l border-divider">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-base font-bold">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-sm text-textPrimary font-medium">
              {user?.username}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-danger hover:bg-danger/80 text-btnText hover:text-btnText transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
