"use client";
import { useEffect, useState } from "react";
import { Activity, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

const actionVariant = {
  CREATE: "success",
  EDIT: "info",
  DELETE: "danger",
  IMPORT: "purple",
  EXPORT: "info",
  LOGIN: "default",
  LOGOUT: "default",
  COMMIT: "warning",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (pg = 1) => {
    setLoading(true);
    fetch(`/api/v1/admin/activity?page=${pg}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setLogs(d.data.logs);
          setTotal(d.data.total);
          setPages(d.data.pages);
          setPage(pg);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const fmt = (date) =>
    new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textMuted">
          {total.toLocaleString()} total events
        </p>
        <Button size="md" variant="outline" onClick={() => load(page)}>
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden md:table-cell">
                  Entity
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden lg:table-cell">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-textMuted">
                    No activity yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr
                    key={log._id}
                    className={`border-b border-divider hover:bg-cardHover transition-colors ${i % 2 === 1 ? "bg-surface" : ""}`}
                  >
                    <td className="px-4 py-3 text-xs text-textMuted whitespace-nowrap">
                      {fmt(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(log.username || "U")[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-textPrimary font-medium">
                          {log.username || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionVariant[log.action] || "default"}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-textMuted hidden md:table-cell capitalize">
                      {log.entityType || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {log.meta ? (
                        <span className="text-xs font-mono text-textMuted">
                          {JSON.stringify(log.meta).slice(0, 60)}
                        </span>
                      ) : (
                        <span className="text-xs text-textMuted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
            <span className="text-xs text-textMuted">
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => load(page - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === pages}
                onClick={() => load(page + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
