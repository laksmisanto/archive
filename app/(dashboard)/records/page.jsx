"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  Download,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [delId, setDelId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef(null);

  const fetch_ = useCallback(
    async (pg = 1, query = dq) => {
      setLoading(true);
      const params = new URLSearchParams({ page: pg, limit: 50 });
      if (query) params.set("q", query);
      const r = await fetch(`/api/v1/records?${params}`).then((x) => x.json());
      if (r.success) {
        setRecords(r.data.records);
        setTotal(r.data.total);
        setPages(r.data.pages);
        setPage(pg);
      }
      setLoading(false);
    },
    [dq],
  );

  useEffect(() => {
    fetch_(1, dq);
  }, [dq]);

  const handleSearch = (val) => {
    setQ(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDq(val), 400);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/v1/records/${delId}`, { method: "DELETE" });
    setDelId(null);
    setDeleting(false);
    fetch_(page);
  };

  const statusVariant = (s) => (s === "committed" ? "success" : "warning");

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted"
          />
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by video ID, metadata, reporter, drive…"
            className="input-base input-field pl-9 pr-9"
          />
          {q && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 text-textMuted hover:text-textPrimary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="lg" variant="outline" onClick={() => fetch_(page, dq)}>
            <RefreshCw size={14} />
          </Button>
          <Link href="/records/new">
            <Button size="lg">
              <Plus size={14} />
              New Record
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-sm text-textMuted">
        <span>{total.toLocaleString()} records total</span>
        {dq && <Badge variant="info">Searching: "{dq}"</Badge>}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Video ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden md:table-cell">
                  Drive
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden sm:table-cell">
                  Reporter
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden lg:table-cell">
                  Metadata
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-textMuted">
                    {dq
                      ? "No records match your search."
                      : "No records yet. Create your first record."}
                  </td>
                </tr>
              ) : (
                records.map((r, i) => (
                  <tr
                    key={r._id}
                    className={`border-b border-divider hover:bg-cardHover transition-colors ${i % 2 === 1 ? "bg-surface" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-primary">
                        {r.videoId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textPrimary hidden md:table-cell">
                      <span className="text-xs">{r.driveLabel || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-textPrimary hidden sm:table-cell">
                      <span className="text-xs">{r.reporterName || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-textMuted line-clamp-1">
                        {r.metadata}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={statusVariant(r.status)}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/records/${r._id}`}>
                          <button className="p-1.5 rounded hover:bg-cardHover text-textMuted hover:text-primary transition-colors">
                            <Eye size={14} />
                          </button>
                        </Link>
                        <Link href={`/records/${r._id}/edit`}>
                          <button className="p-1.5 rounded hover:bg-cardHover text-textMuted hover:text-amber-500 transition-colors">
                            <Edit size={14} />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDelId(r._id)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                onClick={() => fetch_(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === pages}
                onClick={() => fetch_(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      <Modal
        open={!!delId}
        onClose={() => setDelId(null)}
        title="Delete Record"
        size="sm"
      >
        <p className="text-sm text-textMuted mb-5">
          This record will be soft-deleted and can be recovered by an admin.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDelId(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete Record
          </Button>
        </div>
      </Modal>
    </div>
  );
}
