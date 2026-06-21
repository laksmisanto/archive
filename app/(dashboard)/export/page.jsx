"use client";
import { useState } from "react";
import { Download, FileJson, FileText, Layers, Archive } from "lucide-react";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

function ExportCard({ icon: Icon, title, desc, formats, onExport, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-textMuted" />
        </div>
        <div>
          <p className="text-sm font-semibold text-textPrimary">{title}</p>
          <p className="text-xs text-textMuted mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {formats.map((f) => (
          <Button
            key={f}
            size="sm"
            variant="outline"
            loading={loading === f}
            onClick={() => onExport(f)}
          >
            <Download size={13} />
            {f.toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function ExportPage() {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const doExport = async (endpoint, format, filename) => {
    setLoading(format + endpoint);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${endpoint}?format=${format}`);
      if (!res.ok) {
        setError("Export failed");
        setLoading("");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.${format}`;
      a.click();
      setSuccess(`Exported successfully as ${filename}.${format}`);
    } catch {
      setError("Export failed");
    }
    setLoading("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <p className="text-sm text-textMuted">
        Export your archive data. All exports include: Video ID, Drive,
        Reporter, Metadata.
      </p>

      {error && (
        <Alert type="error" onDismiss={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" onDismiss={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <ExportCard
        icon={Layers}
        title="Export Full Archive"
        desc="Download all your archive records"
        formats={["csv", "json", "xlsx", "xls"]}
        loading={loading}
        onExport={(f) =>
          doExport("/api/v1/export/batch/all", f, "full-archive")
        }
      />

      <div className="card p-5">
        <p className="text-sm font-semibold text-textPrimary mb-1">
          Export by Batch
        </p>
        <p className="text-xs text-textMuted mb-3">
          Go to the Batches page to export individual batches.
        </p>
        <a href="/batches">
          <Button size="sm" variant="outline">
            <Layers size={13} />
            Go to Batches
          </Button>
        </a>
      </div>

      <div className="card p-4 bg-surface">
        <p className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">
          Exported Fields
        </p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {["Video ID", "Drive Number", "Reporter Name", "Metadata"].map(
            (f) => (
              <div
                key={f}
                className="flex items-center gap-1.5 text-textPrimary"
              >
                <span className="w-1 h-1 rounded-full bg-primary" />
                {f}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
