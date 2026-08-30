"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, Save, ArrowLeft, CalendarDays } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import Link from "next/link";
// data picker imports
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function NewRecordPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    videoId: "",
    driveId: "",
    driveLabel: "",
    reporterId: "",
    reporterName: "",
    metadata: "",
  });
  const [reporters, setReporters] = useState([]);
  const [drives, setDrives] = useState([]);
  const [batch, setBatch] = useState(null);
  const [dupCheck, setDupCheck] = useState({
    loading: false,
    duplicate: false,
    checked: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dupTimer = useRef(null);
  const [archiveDate, setArchiveDate] = useState(new Date());
  const draftKey = "nams_draft_record";


  useEffect(() => {
    // Load reporters, drives, batch
    Promise.all([
      fetch("/api/v1/reporters").then((r) => r.json()),
      fetch("/api/v1/drives").then((r) => r.json()),
      fetch("/api/v1/batches", { method: "POST" }).then((r) => r.json()),
    ]).then(([rp, dr, bt]) => {
      if (rp.success) setReporters(rp.data.reporters);
      if (dr.success) setDrives(dr.data.drives);
      if (bt.success) setBatch(bt.data.batch);
    });

    // Load draft from localStorage
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setForm(JSON.parse(saved));
    } catch {}
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (form.videoId || form.metadata) {
      localStorage.setItem(draftKey, JSON.stringify(form));
    }
  }, [form]);

  const checkDuplicate = useCallback((videoId) => {
    if (!videoId.trim()) {
      setDupCheck({ loading: false, duplicate: false, checked: false });
      return;
    }
    setDupCheck({ loading: true, duplicate: false, checked: false });
    clearTimeout(dupTimer.current);
    dupTimer.current = setTimeout(async () => {
      const r = await fetch(
        `/api/v1/records/check-duplicate?videoId=${encodeURIComponent(videoId)}`,
      ).then((x) => x.json());
      setDupCheck({
        loading: false,
        duplicate: r.data?.duplicate || false,
        checked: true,
      });
    }, 400);
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "reporterId") {
        const r = reporters.find((x) => x._id === value);
        next.reporterName = r?.name || "";
      }
      if (field === "driveId") {
        const d = drives.find((x) => x._id === value);
        next.driveLabel = d?.label || "";
      }
      return next;
    });
    if (field === "videoId") checkDuplicate(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.videoId.trim() || !form.metadata.trim()) {
      setError("Video ID and Metadata are required");
      return;
    }
    if (dupCheck.duplicate) {
      setError("This Video ID already exists in your archive");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/v1/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, batchId: batch?._id }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.success) {
      localStorage.removeItem(draftKey);
      router.push("/records");
    } else {
      setError(res.error || "Failed to save record");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2">
        <Link href="/records">
          <button className="p-1.5 rounded-lg hover:bg-cardHover text-textMuted">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <h2 className="text-base font-semibold text-textPrimary">
          New Archive Record
        </h2>
        {batch && (
          <span className="ml-auto text-xs text-textMuted bg-surface px-2 py-1 rounded">
            {batch.label}
          </span>
        )}
      </div>

      {/* Draft indicator */}
      <div className="flex items-center gap-1.5 text-xs text-textMuted">
        <Save size={12} />
        <span>Draft auto-saved to browser</span>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Video ID with duplicate detection */}
        <div className="flex items-end gap-2">

          <div className="w-full lg:w-2/5">
           <label className="text-sm font-medium text-textPrimary">Date</label>
             <div className="flex items-center border border-inputBorder rounded-md">
               <span className="block px-2 py-2">
                <CalendarDays size={18} />
              </span>
              <DatePicker
                className="text-base w-full py-2"
                selected={archiveDate}
                onChange={(date) => setArchiveDate(date)}
                placeholderText={new Date().toLocaleDateString()}
              />
             </div>
            </div>
          <div className="space-y-1.5 w-full lg:w-3/5">
            <label className="text-sm font-medium text-textPrimary">
              Video ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                value={form.videoId}
                onChange={(e) => handleChange("videoId", e.target.value)}
                placeholder="e.g. wc_opening_nws_110626_379"
                className={`input-base input-field font-mono pr-8 ${dupCheck.duplicate ? "border-red-400" : dupCheck.checked && !dupCheck.duplicate && form.videoId ? "border-green-400" : ""}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {dupCheck.loading && (
                  <div className="w-3.5 h-3.5 border-2 border-divider border-t-primary rounded-full animate-spin" />
                )}
                {!dupCheck.loading && dupCheck.checked && dupCheck.duplicate && (
                  <AlertTriangle size={14} className="text-red-400" />
                )}
                {!dupCheck.loading &&
                  dupCheck.checked &&
                  !dupCheck.duplicate &&
                  form.videoId && (
                    <CheckCircle size={14} className="text-green-500" />
                  )}
              </div>
            </div>
            {dupCheck.duplicate && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle size={11} /> This Video ID already exists in your
                archive
              </p>
            )}
            {dupCheck.checked && !dupCheck.duplicate && form.videoId && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle size={11} /> Video ID is available
              </p>
            )}
          </div>
        </div>

        {/* Reporter + Drive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Reporter"
            value={form.reporterId}
            onChange={(e) => handleChange("reporterId", e.target.value)}
            className="w-full border border-inputBorder bg-dashboardCardBg p-2 rounded-lg"
          >
            <option value="">Select reporter…</option>
            {reporters.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select
            label="Drive"
            value={form.driveId}
            onChange={(e) => handleChange("driveId", e.target.value)}
            className="w-full border border-inputBorder bg-dashboardCardBg p-2 rounded-lg"
          >
            <option value="">Select drive…</option>
            {drives.map((d) => (
              <option key={d._id} value={d._id}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Metadata */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-textPrimary">
            Metadata <span className="text-red-400">*</span>
          </label>
          <textarea
            value={form.metadata}
            onChange={(e) => handleChange("metadata", e.target.value)}
            placeholder="Full description of the video content…"
            rows={5}
            className="input-base input-field resize-none"
          />
          <p className="text-xs text-textMuted text-right">
            {form.metadata.length}/10000
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/records">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={saving} disabled={dupCheck.duplicate}>
            <Save size={14} /> Save Record
          </Button>
        </div>
      </form>
    </div>
  );
}
