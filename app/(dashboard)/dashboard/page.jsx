'use client';
import { useEffect, useState } from 'react';
import { Archive, Users, HardDrive, Calendar, AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import Link from 'next/link';
import Button from '@/components/ui/Button';

function StatCard({ icon: Icon, label, value, sub, color = 'blue', loading }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-3">
        {loading ? <div className="h-8 w-20 bg-surface rounded animate-pulse" /> : (
          <p className="text-2xl font-bold text-textPrimary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        )}
        <p className="text-sm text-textMuted mt-0.5">{label}</p>
        {sub && <p className="text-xs text-textMuted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const lastBatchDate = stats?.lastBatch?.date ? new Date(stats.lastBatch.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Never';
  const todayBatchStatus = stats?.todayBatch?.status || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Warning */}
      {stats?.showWarning && (
        <Alert type="warning" title="Today's archive data has not been uploaded.">
          It is past 6:00 PM and no records have been added to today's batch. Please upload your daily archive data.
        </Alert>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Archive} label="Total Records" value={stats?.total} loading={loading} color="blue" />
        <StatCard icon={TrendingUp} label="Today's Records" value={stats?.todayCount} loading={loading} color="green" sub="Added today" />
        <StatCard icon={Users} label="Reporters" value={stats?.reporterCount} loading={loading} color="purple" />
        <StatCard icon={HardDrive} label="Drives" value={stats?.driveCount} loading={loading} color="amber" />
      </div>

      {/* Info row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-textMuted" />
            <h3 className="text-sm font-semibold text-textPrimary">Today's Batch Status</h3>
          </div>
          {loading ? <div className="h-10 bg-surface rounded animate-pulse" /> : (
            <div>
              {todayBatchStatus ? (
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm text-textPrimary capitalize font-medium">{todayBatchStatus}</span>
                  <span className="text-xs text-textMuted">— {stats?.todayBatch?.recordCount || 0} records</span>
                </div>
              ) : (
                <p className="text-sm text-textMuted">No batch started today</p>
              )}
              <div className="mt-3 flex gap-2">
                <Link href="/records/new"><Button size="sm">Add Record</Button></Link>
                <Link href="/batches"><Button size="sm" variant="outline">View Batches</Button></Link>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-textMuted" />
            <h3 className="text-sm font-semibold text-textPrimary">Last Upload</h3>
          </div>
          {loading ? <div className="h-10 bg-surface rounded animate-pulse" /> : (
            <div>
              <p className="text-lg font-bold text-textPrimary">{lastBatchDate}</p>
              {stats?.lastBatch && <p className="text-xs text-textMuted mt-1">{stats.lastBatch.recordCount} records in that batch</p>}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-textPrimary mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/records/new"><Button size="sm"><Archive size={14} />New Record</Button></Link>
          <Link href="/import"><Button size="sm" variant="outline"><Archive size={14} />Import Data</Button></Link>
          <Link href="/export"><Button size="sm" variant="outline"><Archive size={14} />Export Archive</Button></Link>
          <Link href="/records"><Button size="sm" variant="ghost"><Archive size={14} />Browse Records</Button></Link>
        </div>
      </div>
    </div>
  );
}
