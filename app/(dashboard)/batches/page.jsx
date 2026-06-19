'use client';
import { useEffect, useState } from 'react';
import { Layers, CheckCircle, Archive, Trash2, Download, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commitId, setCommitId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/v1/batches').then(r => r.json()).then(d => { if (d.success) setBatches(d.data.batches); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCommit = async () => {
    setActing(true);
    await fetch(`/api/v1/batches/${commitId}/commit`, { method: 'POST' });
    setCommitId(null); setActing(false);
    setMsg({ type: 'success', text: 'Batch committed to archive.' });
    load();
  };

  const handleDelete = async () => {
    setActing(true);
    await fetch(`/api/v1/batches/${delId}`, { method: 'DELETE' });
    setDelId(null); setActing(false);
    setMsg({ type: 'success', text: 'Batch deleted.' });
    load();
  };

  const handleExport = async (batchId, format = 'csv') => {
    const res = await fetch(`/api/v1/export/batch/${batchId}?format=${format}`);
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `batch-export.${format}`; a.click();
  };

  const statusVariant = s => ({ open: 'info', committed: 'success', archived: 'purple' }[s] || 'default');

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textMuted">{batches.length} batches total</p>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw size={14} /></Button>
      </div>

      {msg && <Alert type={msg.type} onDismiss={() => setMsg(null)}>{msg.text}</Alert>}

      {loading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-2">
          {batches.length === 0 ? (
            <div className="card p-12 text-center text-textMuted">No batches found. Add records to create your first batch.</div>
          ) : batches.map(b => (
            <div key={b._id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                    <Layers size={16} className="text-textMuted" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-textPrimary truncate">{b.label}</p>
                    <p className="text-xs text-textMuted">
                      {new Date(b.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      {' · '}{b.recordCount} records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                  <button onClick={() => handleExport(b._id, 'csv')} className="p-1.5 rounded hover:bg-cardHover text-textMuted hover:text-primary transition-colors" title="Export CSV"><Download size={14} /></button>
                  <button onClick={() => handleExport(b._id, 'json')} className="p-1.5 rounded hover:bg-cardHover text-textMuted hover:text-primary transition-colors" title="Export JSON"><Archive size={14} /></button>
                  {b.status === 'open' && <Button size="sm" variant="outline" onClick={() => setCommitId(b._id)}><CheckCircle size={12} />Commit</Button>}
                  <button onClick={() => setDelId(b._id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!commitId} onClose={() => setCommitId(null)} title="Commit Batch" size="sm">
        <p className="text-sm text-textMuted mb-5">Once committed, records will be locked. The batch status changes to "committed".</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setCommitId(null)}>Cancel</Button>
          <Button loading={acting} onClick={handleCommit}><CheckCircle size={14} />Commit Batch</Button>
        </div>
      </Modal>

      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete Batch" size="sm">
        <p className="text-sm text-textMuted mb-5">This will soft-delete the batch and all its records. Recoverable by admin.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDelId(null)}>Cancel</Button>
          <Button variant="danger" loading={acting} onClick={handleDelete}>Delete Batch</Button>
        </div>
      </Modal>
    </div>
  );
}
