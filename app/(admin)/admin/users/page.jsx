"use client";
import { useEffect, useState } from "react";
import { Plus, UserCheck, UserX, Trash2, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => {
    setLoading(true);
    fetch("/api/v1/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUsers(d.data.users);
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((r) => r.json());
    setSaving(false);
    if (res.success) {
      setAddModal(false);
      setForm({ username: "", email: "", password: "", role: "user" });
      setMsg({ type: "success", text: "User created." });
      load();
    } else setMsg({ type: "error", text: res.error });
  };

  const toggleActive = async (id, isActive) => {
    await fetch(`/api/v1/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <p className="text-sm text-textMuted">{users.length} users</p>
        <div className="flex gap-2">
          <Button size="lg" variant="outline" onClick={load}>
            <RefreshCw size={24} />
          </Button>
          <Button size="lg" onClick={() => setAddModal(true)}>
            <Plus size={18} />
            Add User
          </Button>
        </div>
      </div>

      {msg && (
        <Alert type={msg.type} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider bg-surface">
              <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider hidden sm:table-cell">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-textMuted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Spinner className="mx-auto" />
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr
                  key={u._id}
                  className={`border-b border-divider hover:bg-cardHover ${i % 2 === 1 ? "bg-surface" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-textPrimary">
                        {u.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-textMuted hidden sm:table-cell text-xs">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "admin" ? "purple" : "info"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? "success" : "danger"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(u._id, u.isActive)}
                        className="p-1.5 border border-CardBorder rounded bg-cardBg hover:bg-cardHover text-textMuted transition-colors"
                        title={u.isActive ? "Deactivate" : "Activate"}
                      >
                        {u.isActive ? (
                          <UserX size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Create New User"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Username"
            value={form.username}
            onChange={(e) =>
              setForm((p) => ({ ...p, username: e.target.value }))
            }
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            required
          />
          <Select
            label="Role"
            value={form.role}
            className="border border-inputBorder p-2.5 bg-dashboardCardBg rounded-lg"
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              size="lg"
              type="button"
              variant="outline"
              onClick={() => setAddModal(false)}
            >
              Cancel
            </Button>
            <Button size="lg" type="submit" loading={saving}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
