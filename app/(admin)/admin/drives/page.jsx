"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, HardDrive } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function DrivesAdminPage() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ label: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch("/api/v1/drives")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDrives(d.data.drives);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/v1/drives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((r) => r.json());
    setSaving(false);
    if (res.success) {
      setAddModal(false);
      setForm({ label: "", location: "" });
      setMsg({ type: "success", text: `Drive "${form.label}" added.` });
      load();
    } else setMsg({ type: "error", text: res.error });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/v1/drives/${delId}`, { method: "DELETE" });
    setDelId(null);
    setDeleting(false);
    setMsg({ type: "success", text: "Drive removed." });
    load();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textMuted">{drives.length} drives</p>
        <div className="flex gap-2">
          <Button size="lg" variant="outline" onClick={load}>
            <RefreshCw size={24} />
          </Button>
          <Button size="lg" onClick={() => setAddModal(true)}>
            <Plus size={18} />
            Add Drive
          </Button>
        </div>
      </div>

      {msg && (
        <Alert type={msg.type} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        ) : drives.length === 0 ? (
          <div className="py-12 text-center text-textMuted text-sm">
            No drives yet. Add your first drive.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Label
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden md:table-cell">
                  Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden sm:table-cell">
                  Added
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {drives.map((d, i) => (
                <tr
                  key={d._id}
                  className={`border-b border-divider hover:bg-cardHover transition-colors ${i % 2 === 1 ? "bg-surface" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <HardDrive
                          size={13}
                          className="text-amber-600 dark:text-amber-400"
                        />
                      </div>
                      <span className="font-medium text-textPrimary">
                        {d.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-textMuted hidden md:table-cell">
                    {d.location || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={d.isActive ? "success" : "danger"}>
                      {d.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-textMuted hidden sm:table-cell">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDelId(d._id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-textMuted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add Drive"
        size="sm"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Drive Label"
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
            placeholder="e.g. AVECO BACKUP - 12"
            required
            autoFocus
          />
          <Input
            label="Location (optional)"
            value={form.location}
            onChange={(e) =>
              setForm((p) => ({ ...p, location: e.target.value }))
            }
            placeholder="e.g. Server Room B, Shelf 3"
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add Drive
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!delId}
        onClose={() => setDelId(null)}
        title="Remove Drive"
        size="sm"
      >
        <p className="text-sm text-textMuted mb-5">
          This drive will be soft-deleted. Existing records will retain the
          drive label.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDelId(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
