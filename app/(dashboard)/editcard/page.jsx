"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Trash2, X, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

/**
 * Highlights only the first occurrence of each keyword in `text`.
 * @param {{ text: string, query: string }} props
 */
function HighlightText({ text, query }) {
  if (!text) return text;
  const str = String(text);
  const keywords = query.trim().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return str;

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ranges = [];
  keywords.forEach((kw) => {
    const re = new RegExp(escapeRegex(kw), "i");
    const match = str.match(re);
    if (match && match.index !== undefined) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  });
  if (ranges.length === 0) return str;

  ranges.sort((a, b) => a.start - b.start);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const r = ranges[i];
    if (r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push(r);
  }

  const parts = [];
  let cursor = 0;
  merged.forEach((r, i) => {
    if (r.start > cursor) parts.push(str.slice(cursor, r.start));
    parts.push(
      <mark key={i} className="bg-statsEmerald text-btnText rounded-sm px-1 py-0.5">
        {str.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < str.length) parts.push(str.slice(cursor));
  return parts;
}

export default function EditCardRecordsPage() {
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

  const fetch_ = useCallback(async (pg = 1, query = dq) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 50 });
    if (query) params.set("q", query);
    const r = await fetch(`/api/v1/editcard/records?${params}`).then((x) => x.json());
    if (r.success) {
      setRecords(r.data.records);
      setTotal(r.data.total);
      setPages(r.data.pages);
      setPage(pg);
    }
    setLoading(false);
  }, [dq]);

  useEffect(() => { fetch_(1, dq); }, [dq]);

  const handleSearch = (val) => {
    setQ(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDq(val), 400);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/v1/editcard/records/${delId}`, { method: "DELETE" });
    setDelId(null);
    setDeleting(false);
    fetch_(page);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search edit card entries…"
            className="input-base input-field pl-9 pr-9"
          />
          {q && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 text-textMuted hover:text-textPrimary">
              <X size={14} />
            </button>
          )}
        </div>
        <Button size="lg" variant="outline" onClick={() => fetch_(page, dq)}>
          <RefreshCw size={14} />
        </Button>
      </div>

      <div className="flex items-center gap-3 text-sm text-textMuted">
        <span>{total.toLocaleString()} edit card entries</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface">
                {/* <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">Entry ID</th> */}
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">Metadata</th>
                {/* <th className="text-right px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="py-12 text-center"><Spinner className="mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={3} className="py-12 text-center text-textMuted">
                  {dq ? "No entries match your search." : "No edit card entries yet."}
                </td></tr>
              ) : (
                records.map((r, i) => (
                  <tr key={r._id} className={`border-b border-divider hover:bg-cardHover transition-colors ${i % 2 === 1 ? "bg-surface" : ""}`}>
                    {/* <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-primary">
                        <HighlightText text={r.entryId} query={dq} />
                      </span>
                    </td> */}
                    <td className="px-4 py-3 text-textPrimary">
                      <span className="text-xs">
                        <HighlightText text={r.metadata} query={dq} />
                      </span>
                    </td>
                    {/* <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDelId(r._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
            <span className="text-xs text-textMuted">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <Button size="md" variant="outline" disabled={page === 1} onClick={() => fetch_(page - 1)}>Previous</Button>
              <Button size="md" variant="outline" disabled={page === pages} onClick={() => fetch_(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete Edit Card Entry" size="md">
        <p className="text-sm text-textMuted mb-5">This entry will be soft-deleted and can be recovered by an admin.</p>
        <div className="flex gap-2 justify-end">
          <Button size="md" variant="outline" onClick={() => setDelId(null)}>Cancel</Button>
          <Button size="md" variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
