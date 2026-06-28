"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${sizes[size]} card animate-fadeIn`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <h2 className="text-base font-semibold text-textPrimary">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-danger/30 text-textMuted transition-colors"
          >
            <X size={18} className="text-danger font-bold" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
