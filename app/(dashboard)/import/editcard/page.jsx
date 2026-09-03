"use client";
import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function ImportEditCardPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["json", "csv", "xlsx", "xls", "txt"].includes(ext)) {
      setError("Only CSV, JSON, XLSX, XLS, TXT files are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }
    setFile(f);
    setError("");
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/v1/import/editcard", {
      method: "POST",
      body: fd,
    }).then((r) => r.json());
    setUploading(false);
    if (res.success) setResult(res.data);
    else setError(res.error || "Import failed");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <p className="text-sm text-textMuted">
        Import archive records from CSV, JSON, XLSX, or XLS files. Duplicates
        will be skipped automatically.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`card p-8 border-2 border-dashed cursor-pointer transition-colors text-center ${drag ? "border-primary bg-blue-50 dark:bg-blue-900/10" : "border-divider hover:border-primary hover:bg-cardHover"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.xlsx,.xls,.txt"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <Upload
          size={32}
          className={`mx-auto mb-3 ${drag ? "text-primary" : "text-textMuted"}`}
        />
        {file ? (
          <div>
            <p className="text-sm font-medium text-textPrimary">{file.name}</p>
            <p className="text-xs text-textMuted mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-textPrimary">
              Drop your file here or click to browse
            </p>
            <p className="text-xs text-textMuted mt-1">
              Supports CSV, JSON, XLSX, XLS, TXT — max 10MB
            </p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
          <FileText size={16} className="text-textMuted" />
          <span className="text-sm text-textPrimary flex-1">{file.name}</span>
          <button
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
            className="text-textMuted hover:text-textPrimary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Format guide */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">
          Expected Columns
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["Date", "Optional"],
            ["ID", "Required for import"],
            ["Drive", "Required"],
            ["Metadata / description", "Required"],
            ["Reporter", "Optional"],
            ["Asset Type", "Required"],
            ["Quality", "Optional"],
            ["Category", "Required"],
          ].map(([col, req]) => (
            <div key={col} className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${req === "Required" ? "bg-danger" : "bg-textMuted"}`}
              />
              <span className="font-mono text-primary">{col}</span>
              <span className="text-textMuted">— {req}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!file}
        loading={uploading}
        className="w-full"
      >
        <Upload size={16} /> {uploading ? "Importing…" : "Start Import"}
      </Button>
    </div>
  );
}
