'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';

export default function EditRecordPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({ driveId: '', driveLabel: '', reporterId: '', reporterName: '', metadata: '' });
  const [reporters, setReporters] = useState([]);
  const [drives, setDrives] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/v1/records/${id}`).then(r => r.json()),
      fetch('/api/v1/reporters').then(r => r.json()),
      fetch('/api/v1/drives').then(r => r.json()),
    ]).then(([rec, rp, dr]) => {
      if (rec.success) {
        setRecord(rec.data.record);
        setForm({ driveId: rec.data.record.driveId || '', driveLabel: rec.data.record.driveLabel || '', reporterId: rec.data.record.reporterId || '', reporterName: rec.data.record.reporterName || '', metadata: rec.data.record.metadata || '' });
      }
      if (rp.success) setReporters(rp.data.reporters);
      if (dr.success) setDrives(dr.data.drives);
    });
  }, [id]);

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'reporterId') { const r = reporters.find(x => x._id === value); next.reporterName = r?.name || ''; }
      if (field === 'driveId') { const d = drives.find(x => x._id === value); next.driveLabel = d?.label || ''; }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const res = await fetch(`/api/v1/records/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).then(r => r.json());
    setSaving(false);
    if (res.success) router.push(`/records/${id}`);
    else setError(res.error || 'Failed to save');
  };

  if (!record) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2">
        <Link href={`/records/${id}`}><button className="p-1.5 rounded-lg hover:bg-cardHover text-textMuted"><ArrowLeft size={16} /></button></Link>
        <h2 className="text-base font-semibold text-textPrimary">Edit Record</h2>
        <span className="ml-auto font-mono text-xs text-primary bg-surface px-2 py-1 rounded">{record.videoId}</span>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Reporter" value={form.reporterId} onChange={e => handleChange('reporterId', e.target.value)}>
            <option value="">Select reporter…</option>
            {reporters.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </Select>
          <Select label="Drive" value={form.driveId} onChange={e => handleChange('driveId', e.target.value)}>
            <option value="">Select drive…</option>
            {drives.map(d => <option key={d._id} value={d._id}>{d.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-textPrimary">Metadata <span className="text-red-400">*</span></label>
          <textarea value={form.metadata} onChange={e => handleChange('metadata', e.target.value)} rows={6} className="input-base resize-none" />
        </div>
        <div className="flex justify-end gap-2">
          <Link href={`/records/${id}`}><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" loading={saving}><Save size={14} />Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
