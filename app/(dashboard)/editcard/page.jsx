"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Edit3, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";

const blankForm = {
  entryId: "",
  archiveDate: "",
  drive: "",
  metadata: "",
  reporter: "",
  assetType: "",
  category: "",
  quality: "",
};

const defaultAssetTypes = ["GV", "EDC", "DOC", "GFX"];
const defaultCategories = ["SPORT", "BUSINESS", "WEATHER", "SCIENCE", "POLITICAL", "CRIME", "OTHER"];
const qualityOptions = ["SD", "HD", "FHD", "2K", "4K", "8K"];
const assetTypeLabel = (type) => type === "GV" || type === "GVW" ? "GV (General View)" : type;

const dateValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const selectedDateValue = (value) =>
  value
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : "";
const displayDate = (value) =>
  value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)) : "—";

export default function EditCardRecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [assetType, setAssetType] = useState("");
  const [category, setCategory] = useState("");
  const [types, setTypes] = useState(defaultAssetTypes);
  const [categories, setCategories] = useState(defaultCategories);
  const [driveOptions, setDriveOptions] = useState([]);
  const [reporterOptions, setReporterOptions] = useState([]);
  const [userRole, setUserRole] = useState("user");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);
  const controller = useRef(null);

  const load = useCallback(
    async (nextPage = 1, query = q, type = assetType, categoryFilter = category) => {
      controller.current?.abort();
      controller.current = new AbortController();
      setLoading(true);

      try {
        const params = new URLSearchParams({ page: String(nextPage), limit: "25" });
        if (query) params.set("q", query);
        if (type) params.set("assetType", type);
        if (categoryFilter) params.set("category", categoryFilter);

        const response = await fetch(`/api/v1/editcard/records?${params}`, {
          signal: controller.current.signal,
        });
        const data = await response.json();

        if (data.success) {
          setRecords(data.data.records);
          setTotal(data.data.total);
          setPages(data.data.pages || 1);
          setPage(data.data.page);
          setTypes([...new Set([
            ...defaultAssetTypes,
            ...(data.data.assetTypes || []).map((type) => type === "GVW" ? "GV" : type),
          ])].sort());
          setCategories([...new Set([...defaultCategories, ...(data.data.categories || [])])].sort());
        } else {
          setError(data.error || "Unable to load edit card records");
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setError("Unable to load edit card records");
        }
      } finally {
        setLoading(false);
      }
    },
    [q, assetType, category],
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/drives").then((response) => response.json()),
      fetch("/api/v1/reporters").then((response) => response.json()),
    ]).then(([drives, reporters]) => {
      if (drives.success) setDriveOptions(drives.data.drives.map((drive) => drive.label));
      if (reporters.success) setReporterOptions(reporters.data.reporters.map((reporter) => reporter.name));
    });
  }, []);

  useEffect(() => {
    const seed = window.setTimeout(() => {
      void load();
    }, 0);

    fetch("/api/v1/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setUserRole(data.data.user.role);
      });

    return () => {
      window.clearTimeout(seed);
      controller.current?.abort();
      clearTimeout(timer.current);
    };
  }, [load]);

  const search = (value) => {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(1, value, assetType, category), 350);
  };

  const chooseType = (value) => {
    setAssetType(value);
    load(1, q, value);
  };

  const chooseCategory = (value) => {
    setCategory(value);
    load(1, q, assetType, value);
  };

  const openCreate = () => {
    setError("");
    setForm(blankForm);
    setModal("create");
  };

  const openEdit = (record) => {
    setError("");
    setForm({
      entryId: record.entryId || "",
      archiveDate: dateValue(record.archiveDate),
      drive: record.drive || "",
      metadata: record.metadata || "",
      reporter: record.reporter || "",
      assetType: record.assetType || "",
      category: record.category || "",
      quality: record.quality || "",
    });
    setModal({ mode: "edit", record });
  };

  const save = async () => {
    if (!form.metadata.trim()) {
      setError("Metadata is required");
      return;
    }
    if (!form.drive.trim()) {
      setError("Drive is required");
      return;
    }
    if (!form.assetType.trim()) {
      setError("Asset type is required");
      return;
    }
    if (!form.category.trim()) {
      setError("Category is required");
      return;
    }
    if (form.quality && !qualityOptions.includes(form.quality.toUpperCase())) {
      setError("Quality must be one of: SD, HD, FHD, 2K, 4K, 8K");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = typeof modal === "object";
      const response = await fetch(
        isEdit ? `/api/v1/editcard/records/${modal.record._id}` : "/api/v1/editcard/records",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Unable to save record");
        return;
      }

      if (!isEdit && data.data?.record?.entryId) {
        try {
          await navigator.clipboard?.writeText(data.data.record.entryId);
        } catch {
          // clipboard permissions may be unavailable
        }
      }

      setModal(null);
      load(isEdit ? page : 1);
    } catch {
      setError("Unable to save record");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!modal || typeof modal !== "object") return;

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/editcard/records/${modal.record._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Unable to delete record");
        return;
      }

      setModal(null);
      load(records.length === 1 && page > 1 ? page - 1 : page);
    } catch {
      setError("Unable to delete record");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, required = false) => (
    <label className="space-y-1 block">
      <span className="text-sm text-textPrimary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        value={form[name] ?? ""}
        readOnly={name === "entryId"}
        placeholder={name === "entryId" ? "Generated on save" : ""}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        className="input-base input-field w-full"
      />
    </label>
  );

  const selectField = (label, name, options, required = false) => (
    <label className="space-y-1 block">
      <span className="text-sm text-textPrimary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <select
        value={form[name] ?? ""}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        className="input-base bg-dashboardCardBg input-field w-full"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );

  const assetTypeField = (
    <label className="space-y-1 block">
      <span className="text-sm text-textPrimary">Asset Type<span className="text-danger"> *</span></span>
      <input
        value={form.assetType === "GVW" ? "GV" : form.assetType}
        maxLength={3}
        pattern="[A-Za-z0-9]{3}"
        list="edit-card-asset-types"
        onChange={(event) => setForm({ ...form, assetType: event.target.value.toUpperCase() === "GV" ? "GV" : event.target.value.toUpperCase() })}
        className="input-base bg-dashboardCardBg input-field w-full"
        placeholder="GVW"
      />
      <datalist id="edit-card-asset-types">
        {types.map((type) => <option key={type} value={type} />)}
      </datalist>
    </label>
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            value={q}
            onChange={(event) => search(event.target.value)}
            placeholder="Search ID, metadata, drive, reporter…"
            className="input-base input-field w-full pl-9 pr-9"
          />
          {q && (
            <button
              aria-label="Clear search"
              onClick={() => search("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <select
          aria-label="Filter by asset type"
          value={assetType}
          onChange={(event) => chooseType(event.target.value)}
          className="input-base input-field sm:w-44"
        >
          <option value="">All asset types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {assetTypeLabel(type)}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => chooseCategory(event.target.value)}
          className="input-base input-field sm:w-44"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <Button variant="outline" onClick={() => load(page)}>
          <RefreshCw size={15} />
        </Button>

        {userRole !== "user" && (
          <Button onClick={openCreate}>
            <Plus size={15} /> Add Edit Card Record
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <p className="text-sm text-textMuted">{total.toLocaleString()} Edit Card Records</p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-surface text-left text-xs uppercase text-textMuted">
                <th className="p-3">Date</th>
                <th className="p-3">ID</th>
                <th className="p-3">Drive</th>
                <th className="p-3">Metadata</th>
                <th className="p-3">Reporter</th>
                <th className="p-3">Asset Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Quality</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-textMuted">
                    No edit card records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record._id} className="border-b border-divider hover:bg-cardHover">
                    <td className="p-3 whitespace-nowrap">{displayDate(record.archiveDate)}</td>
                    <td className="p-3 font-mono text-xs">{record.entryId}</td>
                    <td className="p-3 whitespace-nowrap">{record.drive || "—"}</td>
                    <td className="p-3 max-w-md whitespace-pre-wrap">{record.metadata || "—"}</td>
                    <td className="p-3 whitespace-nowrap">{record.reporter || "—"}</td>
                    <td className="p-3 whitespace-nowrap">{record.assetType ? assetTypeLabel(record.assetType) : "—"}</td>
                    <td className="p-3 whitespace-nowrap">{record.category || "—"}</td>
                    <td className="p-3 whitespace-nowrap">{record.quality || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(record)}
                          className="p-2 rounded hover:bg-cardHover text-textMuted hover:text-primary"
                          title="Edit record"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setModal({ mode: "delete", record })}
                          className="p-2 rounded hover:bg-cardHover text-textMuted hover:text-danger"
                          title="Delete record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 text-sm text-textMuted">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="rounded border border-inputBorder px-3 py-1.5 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={page >= pages}
            onClick={() => load(page + 1)}
            className="rounded border border-inputBorder px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {modal && (
        <Modal
          open={!!modal}
          onClose={() => setModal(null)}
          title={
            modal === "create"
              ? "Add Edit Card Record"
              : modal.mode === "edit"
                ? "Edit Edit Card Record"
                : "Delete Edit Card Record"
          }
          size={modal === "create" || modal?.mode === "edit" ? "lg" : "sm"}
        >
          {modal === "create" || modal?.mode === "edit" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="space-y-1 block">
                    <span className="text-sm text-textPrimary">
                      Metadata<span className="text-danger"> *</span>
                    </span>
                    <textarea
                      value={form.metadata}
                      onChange={(event) => setForm({ ...form, metadata: event.target.value })}
                      rows={5}
                      className="input-base input-field w-full resize-y"
                    />
                  </label>
                </div>

                <div>{assetTypeField}</div>
                <div>{selectField("Reporter", "reporter", reporterOptions)}</div>
                <div>{selectField("Drive", "drive", driveOptions, true)}</div>
                <div>{selectField("Category", "category", categories, true)}</div>
                <div>{selectField("Quality", "quality", qualityOptions)}</div>

                <div>
                  <label className="space-y-1 block">
                    <span className="text-sm text-textPrimary">Archive Date</span>
                    <DatePicker
                      selected={form.archiveDate ? new Date(form.archiveDate) : null}
                      onChange={(date) => setForm({ ...form, archiveDate: selectedDateValue(date) })}
                      dateFormat="yyyy-MM-dd"
                      className="input-base input-field w-full"
                      placeholderText="Select date"
                      isClearable
                    />
                  </label>
                </div>
                <div>{field("Entry ID", "entryId")}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-textMuted">
                This will remove the record from the active list. It can be restored by an admin later.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button variant="danger" loading={saving} onClick={remove}>
                  Delete
                </Button>
              </div>
            </div>
          )}

          {modal === "create" || modal?.mode === "edit" ? (
            <div className="flex justify-end gap-2 pt-4 border-t border-divider mt-4">
              <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>
                Cancel
              </Button>
              <Button loading={saving} onClick={save}>
                {modal === "create" ? "Save record" : "Update record"}
              </Button>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
