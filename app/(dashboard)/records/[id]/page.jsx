"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Clock } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";

const formatArchiveDate = (value) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));

export default function RecordDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [delModal, setDelModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/records/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRecord(d.data.record);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/v1/records/${id}`, { method: "DELETE" });
    router.push("/records");
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  if (!record)
    return (
      <div className="text-center py-12 text-textMuted">Record not found</div>
    );

  const fields = [
    { label: "Video ID", value: record.videoId, mono: true },
    { label: "Archive Date", value: formatArchiveDate(record.archiveDate) },
    { label: "Reporter", value: record.reporterName || "—" },
    { label: "Drive", value: record.driveLabel || "—" },
    { label: "Status", value: record.status, badge: true },
    { label: "Created", value: new Date(record.createdAt).toLocaleString() },
    { label: "Updated", value: new Date(record.updatedAt).toLocaleString() },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
      <div className="flex items-center gap-2">
        <Link href="/records">
          <button className="p-2 rounded-lg hover:bg-cardHover text-textMuted">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <h2 className="text-base font-semibold text-textPrimary flex-1">
          Record Detail
        </h2>
        <Link href={`/records/${id}/edit`}>
          <Button size="md" variant="outline">
            <Edit size={14} />
            Edit
          </Button>
        </Link>
        <Button size="md" variant="danger" onClick={() => setDelModal(true)}>
          <Trash2 size={14} />
          Delete
        </Button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs text-textMuted mb-1">{f.label}</p>
              {f.badge ? (
                <Badge
                  variant={f.value === "committed" ? "success" : "warning"}
                >
                  {f.value}
                </Badge>
              ) : (
                <p
                  className={`text-sm text-textPrimary ${f.mono ? "font-mono text-primary" : ""}`}
                >
                  {f.value}
                </p>
              )}
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-textMuted mb-2">Metadata</p>
          <div className="bg-surface rounded-lg p-4 text-sm text-textPrimary whitespace-pre-wrap">
            {record.metadata}
          </div>
        </div>
      </div>

      <Modal
        open={delModal}
        onClose={() => setDelModal(false)}
        title="Delete Record"
        size="sm"
      >
        <p className="text-sm text-textMuted mb-5">
          Soft-delete this record? It can be recovered by an admin.
        </p>
        <div className="flex gap-2 justify-end">
          <Button
            size="md"
            variant="outline"
            onClick={() => setDelModal(false)}
          >
            Cancel
          </Button>
          <Button
            size="md"
            variant="danger"
            loading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
