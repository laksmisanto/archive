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
  FilterIcon,
  CalendarDays,
  Copy,
  CopyCheck,
  Check,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
// data picker imports
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const formatArchiveDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

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
  const [copiedId, setCopiedId]=useState(null);

  const handleCopyId = async(videoId) =>{
    try{
      await navigator.clipboard.writeText(videoId);
      setCopiedId(videoId);
      setTimeout(()=> setCopiedId(null), 2000);
    }catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }

  // date picker
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const formatDateParam = (date) =>
    date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : "";

  const fetch_ = useCallback(
    async (pg = 1, query = dq) => {
      setLoading(true);
      const params = new URLSearchParams({ page: pg, limit: 50 });
      if (query) params.set("q", query);
      if (startDate) params.set("startDate", formatDateParam(startDate));
      if (endDate) params.set("endDate", formatDateParam(endDate));
      const r = await fetch(`/api/v1/records?${params}`).then((x) => x.json());
      if (r.success) {
        setRecords(r.data.records);
        setTotal(r.data.total);
        setPages(r.data.pages);
        setPage(pg);
      }
      setLoading(false);
    },
    [dq, endDate, startDate],
  );

function HighlightText({ text, query }) {
  if (!text) return text;
  const str = String(text);
  const keywords = query.trim().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return str;

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // find only the first occurrence of each keyword
  const ranges = [];
  keywords.forEach((kw) => {
    const re = new RegExp(escapeRegex(kw), "i");
    const match = str.match(re);
    if (match && match.index !== undefined) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  });

  if (ranges.length === 0) return str;

  // sort and merge overlapping ranges (e.g. two keywords hitting the same spot)
  ranges.sort((a, b) => a.start - b.start);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const r = ranges[i];
    if (r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push(r);
    }
  }

  const parts = [];
  let cursor = 0;
  merged.forEach((r, i) => {
    if (r.start > cursor) parts.push(str.slice(cursor, r.start));
    parts.push(
      <mark
        key={i}
        className="bg-statsEmerald text-btnText rounded-sm px-1 py-0.5"
      >
        {str.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < str.length) parts.push(str.slice(cursor));

  return parts;
}

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetch_(1, dq);
  }, [dq, fetch_]);

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

      {/* filter section data filter by date */}
      <div className="flex items-center space-x-8">
        <span className="flex justify-center items-center size-8 rounded-lg border border-success bg-success/20 text-success">
          <FilterIcon size={18} />
        </span>
        <div className="flex items-center space-x-2 text-textPrimary">
          <div className="w-60 flex items-center border border-inputBorder rounded-md">
            <span className="block px-2 py-2">
              <CalendarDays size={18} />
            </span>
            <DatePicker
              className="text-base w-full py-2"
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              placeholderText={new Date().toLocaleDateString()}
            />
          </div>
          <span>To</span>
          <div className="w-60 flex items-center border border-inputBorder rounded-md">
            <span className="block px-2 py-2">
              <CalendarDays size={18} />
            </span>
            <DatePicker
              className="text-base w-full py-2"
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              placeholderText={new Date().toLocaleDateString()}
            />
          </div>
          <button className="px-4 py-2 bg-danger text-btnText rounded-sm cursor-pointer" onClick={()=>{setStartDate(null); setEndDate(null)}}>Reset</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-sm text-textMuted">
        <span>{total.toLocaleString()} records total</span>
        {dq && <Badge variant="info">Searching: &quot;{dq}&quot;</Badge>}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Date
                </th>
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
                    <td>
                      {formatArchiveDate(r.archiveDate)}
                    </td>
                    <td className="px-4 py-3 flex items-center space-x-2">
                      <button
                        className="size-6 rounded-sm border-success bg-success text-btnText flex justify-center items-center"
                        onClick={() => handleCopyId(r.videoId)}
                      >
                        {copiedId === r.videoId ? (
                          <Check size={16} className="cursor-pointer"/>
                        ) : (
                          <Copy size={16} className="cursor-pointer"/>
                        )}
                      </button>
                      <span className="font-mono text-sm font-medium text-textSecondary">
                        <HighlightText text={r.videoId} query={dq} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary hidden md:table-cell">
                      <span className="text-sm">
                        <HighlightText text={r.driveLabel || "—"} query={dq} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary hidden sm:table-cell">
                      <span className="text-sm">
                        <HighlightText text={r.reporterName || "—"} query={dq} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary hidden lg:table-cell">
                      {/* <span className="text-xs text-textMuted line-clamp-1 py-1.5"> */}
                      <span className="text-sm py-1.5">
                        <HighlightText text={r.metadata} query={dq} />
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
            <span className="text-sm text-textMuted">
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button
                size="md"
                variant="outline"
                disabled={page === 1}
                onClick={() => fetch_(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="md"
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
        size="md"
      >
        <p className="text-sm text-textMuted mb-5">
          This record will be soft-deleted and can be recovered by an admin.
        </p>
        <div className="flex gap-2 justify-end">
          <Button size="md" variant="outline" onClick={() => setDelId(null)}>
            Cancel
          </Button>
          <Button
            size="md"
            variant="danger"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete Record
          </Button>
        </div>
      </Modal>
    </div>
  );
}
