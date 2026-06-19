"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const sizeMap = {
  sm: {
    wrapper: "h-8 w-16",
    circle: "h-6 w-6",
    translate: "translate-x-8",
    icon: "h-3.5 w-3.5",
  },
  md: {
    wrapper: "h-10 w-20",
    circle: "h-8 w-8",
    translate: "translate-x-10",
    icon: "h-4.5 w-4.5",
  },
  lg: {
    wrapper: "h-12 w-24",
    circle: "h-10 w-10",
    translate: "translate-x-12",
    icon: "h-5.5 w-5.5",
  },
};

export default function ThemeToggle({ size = "sm" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = sizeMap[size];

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative
        flex
        items-center
        rounded-full
        border
        border-white/10
        px-1
        transition-all
        duration-500
        ease-in-out
        hover:scale-105
        active:scale-95
        ${s.wrapper}
        ${
          isDark
            ? "bg-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
            : "bg-sky-100 shadow-[0_0_20px_rgba(0,0,0,0.08)]"
        }
      `}
    >
      {/* Sliding Circle */}
      <div
        className={`
          absolute
          z-10
          flex
          items-center
          justify-center
          rounded-full
          shadow-lg
          transition-all
          duration-500
          ease-in-out
          ${s.circle}
          ${
            isDark
              ? `${s.translate} bg-slate-800 rotate-180`
              : "translate-x-0 bg-gradient-to-br from-yellow-300 to-orange-500"
          }
        `}
      >
        {isDark ? (
          <Moon className={`${s.icon} text-slate-200`} />
        ) : (
          <Sun className={`${s.icon} text-white`} />
        )}
      </div>

      {/* Icons */}
      <div className="relative flex w-full items-center justify-between px-2">
        <Sun
          className={`
            ${s.icon}
            transition-all
            duration-500
            ${isDark ? "text-slate-500 opacity-40" : "text-yellow-500"}
          `}
        />

        <Moon
          className={`
            ${s.icon}
            transition-all
            duration-500
            ${isDark ? "text-slate-200" : "text-slate-400 opacity-40"}
          `}
        />
      </div>
    </button>
  );
}
