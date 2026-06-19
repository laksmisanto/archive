'use client';
import { useEffect, useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/v1/auth/me').then(r => r.json()).then(d => { if (d.success) setUser(d.data.user); });
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeIn">
      {msg && <Alert type={msg.type} onDismiss={() => setMsg(null)}>{msg.text}</Alert>}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold text-textPrimary">{user?.username}</p>
            <p className="text-sm text-textMuted capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-textMuted">Username</label>
            <p className="text-sm text-textPrimary font-medium mt-0.5">{user?.username}</p>
          </div>
          <div>
            <label className="text-xs text-textMuted">Email</label>
            <p className="text-sm text-textPrimary mt-0.5">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs text-textMuted">Role</label>
            <p className="text-sm text-textPrimary capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-textPrimary mb-1">About NAMS</p>
        <p className="text-xs text-textMuted">News Archive Metadata Management System v1.0</p>
        <p className="text-xs text-textMuted mt-1">Internal archive system for managing video footage metadata.</p>
      </div>
    </div>
  );
}
