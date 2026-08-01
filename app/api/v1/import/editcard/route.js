import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import EditCardRecord from "@/lib/db/models/EditCardRecord";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { ok, err, serverError } from "@/lib/utils/apiResponse";
import * as XLSX from "xlsx";

const SUPPORTED_EXTENSIONS = new Set(["json", "csv", "xlsx", "xls", "txt"]);
const HEADER_LIKE = new Set(["metadata", "description", "desc"]);

/**
 * Parses an uploaded file into a flat list of metadata strings.
 * Single-column only — one metadata/description entry per line or row.
 * @param {File} file
 * @returns {Promise<string[]>}
 */
const parseMetadataList = async (file) => {
  const ext = file.name.split(".").pop().toLowerCase();
  const raw = await file.arrayBuffer();

  if (ext === "json") {
    const text = Buffer.from(raw).toString("utf8");
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON must be an array of strings or objects");
    }
    return parsed
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return `${item.metadata ?? item.description ?? item.desc ?? ""}`;
        }
        return "";
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (ext === "txt" || ext === "csv") {
    const text = Buffer.from(raw).toString("utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^"(.*)"$/, "$1").trim())
      .filter(Boolean);
  }

  const workbook = XLSX.read(Buffer.from(raw), { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("Spreadsheet file is empty");

  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!Array.isArray(rows)) {
    throw new Error("Spreadsheet file could not be parsed");
  }

  return rows.map((row) => `${row?.[0] ?? ""}`.trim()).filter(Boolean);
};

/**
 * Builds a sequential, collision-checked entry ID within EditCardRecord's own space.
 * @param {string} dateStamp
 * @param {number} seq
 * @returns {string}
 */
const buildEntryId = (dateStamp, seq) =>
  `EC-${dateStamp}-${String(seq).padStart(4, "0")}`;

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file) return err("No file provided");

      const ext = file.name.split(".").pop().toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        return err("Only CSV, JSON, XLSX, XLS, and TXT files are supported");
      }

      let entries;
      try {
        entries = await parseMetadataList(file);
      } catch (e) {
        return err(e.message || "Invalid file format");
      }

      if (entries.length && HEADER_LIKE.has(entries[0].trim().toLowerCase())) {
        entries = entries.slice(1);
      }

      if (entries.length === 0) {
        return err("No metadata entries found in file");
      }

      const ownerId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateStamp = today.toISOString().slice(0, 10).replace(/-/g, "");

      const existing = await EditCardRecord.find({ ownerId, deletedAt: null })
        .select("entryId metadata")
        .lean();

      const existingIdSet = new Set(existing.map((r) => r.entryId));
      const existingMetaSet = new Set(
        existing.map((r) => r.metadata.trim().toLowerCase()),
      );

      const toInsert = [];
      const skipped = [];
      const seenInFile = new Set();
      let seq = 1;

      for (const raw of entries) {
        const metadata = raw.trim();
        const key = metadata.toLowerCase();

        if (existingMetaSet.has(key) || seenInFile.has(key)) {
          skipped.push(metadata);
          continue;
        }
        seenInFile.add(key);

        let entryId = buildEntryId(dateStamp, seq++);
        while (existingIdSet.has(entryId)) {
          entryId = buildEntryId(dateStamp, seq++);
        }
        existingIdSet.add(entryId);

        toInsert.push({ entryId, metadata, ownerId });
      }

      let inserted = 0;
      if (toInsert.length > 0) {
        const result = await EditCardRecord.insertMany(toInsert, {
          ordered: false,
        }).catch((e) => {
          if (e.insertedDocs) return { insertedCount: e.insertedDocs.length };
          throw e;
        });
        inserted = result.insertedCount || toInsert.length;
      }

      await ActivityLog.create({
  userId: ownerId,
  username: req.user.username,
  action: "IMPORT",
  entityType: "EditCardRecord",
  meta: { total: entries.length, inserted, skipped: skipped.length },
});

      return ok({ total: entries.length, inserted, skipped: skipped.length });
    } catch (e) {
      return serverError(e);
    }
  });
}
