'use client';
import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['json', 'csv'].includes(ext)) { setError('Only JSON and CSV files are supported'); return; }
    if (f.size > 50 * 1024 * 1024) { setError('File too large (max 50MB)'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/v1/import', { method: 'POST', body: fd }).then(r => r.json());
    setUploading(false);
    if (res.success) setResult(res.data);
    else setError(res.error || 'Import failed');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <p className="text-sm text-textMuted">Import archive records from CSV or JSON files. Duplicates will be skipped automatically.</p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`card p-8 border-2 border-dashed cursor-pointer transition-colors text-center ${drag ? 'border-primary bg-blue-50 dark:bg-blue-900/10' : 'border-divider hover:border-primary hover:bg-cardHover'}`}
      >
        <input ref={inputRef} type="file" accept=".csv,.json" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        <Upload size={32} className={`mx-auto mb-3 ${drag ? 'text-primary' : 'text-textMuted'}`} />
        {file ? (
          <div>
            <p className="text-sm font-medium text-textPrimary">{file.name}</p>
            <p className="text-xs text-textMuted mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-textPrimary">Drop your file here or click to browse</p>
            <p className="text-xs text-textMuted mt-1">Supports CSV, JSON — max 50MB</p>
          </div>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
          <FileText size={16} className="text-textMuted" />
          <span className="text-sm text-textPrimary flex-1">{file.name}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-textMuted hover:text-textPrimary"><X size={14} /></button>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {/* Format guide */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold text-textMuted uppercase tracking-wider">Expected Columns</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[['videoid / video_id', 'Required'], ['metadata / description', 'Required'], ['reporter', 'Optional'], ['drive / drivelabel', 'Optional']].map(([col, req]) => (
            <div key={col} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${req === 'Required' ? 'bg-red-400' : 'bg-textMuted'}`} />
              <span className="font-mono text-primary">{col}</span>
              <span className="text-textMuted">— {req}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!file} loading={uploading} className="w-full">
        <Upload size={16} /> {uploading ? 'Importing…' : 'Start Import'}
      </Button>

      {/* Result */}
      {result && (
        <div className="card p-5 space-y-3 animate-fadeIn">
          <p className="text-sm font-semibold text-textPrimary">Import Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Rows', value: result.total, icon: FileText, color: 'text-textPrimary' },
              { label: 'Inserted', value: result.inserted, icon: CheckCircle, color: 'text-green-500' },
              { label: 'Skipped', value: result.skipped, icon: AlertTriangle, color: 'text-amber-500' },
              { label: 'Errors', value: result.errors?.length || 0, icon: XCircle, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-surface rounded-lg">
                <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-textMuted">{s.label}</p>
              </div>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-surface rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-textPrimary mb-2">Row Errors:</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-red-500">Row {e.row}: {e.reason}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
