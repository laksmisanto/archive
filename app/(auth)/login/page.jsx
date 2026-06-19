"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Tv2, LogIn } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("nams-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.classList.toggle(
      "dark",
      saved ? saved === "dark" : prefersDark,
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((r) => r.json());
    setLoading(false);
    if (res.success) router.replace("/dashboard");
    else setError(res.error || "Login failed. Check your credentials.");
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Tv2 size={16} className="text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-textPrimary">NAMS</span>
            <span className="text-xs text-textMuted ml-2 hidden sm:inline">
              News Archive Metadata System
            </span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Center form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Tv2 size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-textPrimary">
              Sign in to NAMS
            </h1>
            <p className="text-sm text-textMuted mt-1">
              Internal archive management portal
            </p>
          </div>

          {/* Card */}
          <div className="card p-6 space-y-4">
            {error && (
              <Alert type="error" onDismiss={() => setError("")}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, username: e.target.value }))
                  }
                  placeholder="Enter your username"
                  className="input-base input-field"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password: e.target.value }))
                    }
                    placeholder="Enter your password"
                    className="input-base input-field pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                size="lg"
                type="submit"
                loading={loading}
                className="btn w-full mt-2"
              >
                <LogIn size={16} /> Sign In
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-textMuted mt-6">
            Contact your administrator if you need access.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6">
        <p className="text-xs text-textMuted">
          NAMS v1.0 — Confidential Internal System
        </p>
      </div>
    </div>
  );
}
