"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, UserCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function ReportersAdminPage() {
  const [reporters, setReporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch("/api/v1/reporters")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReporters(d.data.reporters);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/v1/reporters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.success) {
      setAddModal(false);
      setName("");
      setMsg({ type: "success", text: `Reporter "${name}" added.` });
      load();
    } else setMsg({ type: "error", text: res.error });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/v1/reporters/${delId}`, { method: "DELETE" });
    setDelId(null);
    setDeleting(false);
    setMsg({ type: "success", text: "Reporter removed." });
    load();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textMuted">{reporters.length} reporters</p>
        <div className="flex gap-2">
          <Button size="lg" variant="outline" onClick={load}>
            <RefreshCw size={24} />
          </Button>
          <Button size="lg" onClick={() => setAddModal(true)}>
            <Plus size={18} />
            Add Reporter
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
        ) : reporters.length === 0 ? (
          <div className="py-12 text-center text-textMuted text-sm">
            No reporters yet. Add your first reporter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                  Name
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
              {reporters.map((r, i) => (
                <tr
                  key={r._id}
                  className={`border-b border-divider hover:bg-cardHover transition-colors ${i % 2 === 1 ? "bg-surface" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <UserCheck
                          size={13}
                          className="text-purple-600 dark:text-purple-400"
                        />
                      </div>
                      <span className="font-medium text-textPrimary">
                        {r.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.isActive ? "success" : "danger"}>
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-textMuted hidden sm:table-cell">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDelId(r._id)}
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
        title="Add Reporter"
        size="sm"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Reporter Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shanto, Rahim"
            required
            autoFocus
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
              Add Reporter
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!delId}
        onClose={() => setDelId(null)}
        title="Remove Reporter"
        size="sm"
      >
        <p className="text-sm text-textMuted mb-5">
          This reporter will be soft-deleted. Existing records are not affected.
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
