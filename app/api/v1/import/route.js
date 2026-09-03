import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import ArchiveRecord from "@/lib/db/models/ArchiveRecord";
import Reporter from "@/lib/db/models/Reporter";
import Drive from "@/lib/db/models/Drive";
import Batch from "@/lib/db/models/Batch";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { ok, err, serverError } from "@/lib/utils/apiResponse";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 200_000;
const SUPPORTED_EXTENSIONS = new Set(["json", "csv", "xlsx", "xls"]);
const keys = { date: ["date"], videoId: ["videoid", "video id", "video_id", "id"], drive: ["drive", "drive label", "drivelabel", "drive name"], metadata: ["metadata", "description", "meta data", "desc"], reporter: ["reporter", "reporter name", "reportername"] };
const normalizeHeader = (value) => String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
const cell = (value) => String(value ?? "").trim();

function mapRows(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(normalizeHeader);
  const hasHeaders = header.some((value) => Object.values(keys).flat().includes(value));
  const indexFor = (field, fallback) => { const found = header.findIndex((value) => keys[field].includes(value)); return found >= 0 ? found : fallback; };
  const indexes = { date: indexFor("date", 0), videoId: indexFor("videoId", 1), drive: indexFor("drive", 2), metadata: indexFor("metadata", 3), reporter: indexFor("reporter", 4) };
  return rows.slice(hasHeaders ? 1 : 0).filter((row) => row.some((value) => cell(value))).map((row) => Object.fromEntries(Object.entries(indexes).map(([field, index]) => [field, cell(row[index])])));
}

async function parseRowsFromFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) throw new Error("Only CSV, JSON, XLSX, and XLS files are supported");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (maximum 10 MB)");
  const raw = await file.arrayBuffer();
  let rows;
  if (ext === "json") {
    const parsed = JSON.parse(Buffer.from(raw).toString("utf8"));
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
    rows = parsed.map((row) => [row.date, row.videoId ?? row.videoid ?? row["video id"], row.drive, row.metadata ?? row.description, row.reporter]);
  } else if (ext === "csv") {
    rows = parse(Buffer.from(raw).toString("utf8"), { bom: true, relax_column_count: true, skip_empty_lines: true });
  } else {
    const workbook = XLSX.read(Buffer.from(raw), { type: "buffer", dense: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("Spreadsheet file is empty");
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  }
  const mapped = mapRows(rows);
  if (mapped.length > MAX_ROWS) throw new Error(`File has too many rows (maximum ${MAX_ROWS.toLocaleString()})`);
  return mapped;
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      const contentLength = Number(req.headers.get("content-length") || 0);
      if (contentLength > MAX_FILE_BYTES + 100_000) return err("File is too large (maximum 10 MB)", 413);
      const file = (await req.formData()).get("file");
      if (!file || typeof file.arrayBuffer !== "function") return err("No file provided");
      const rows = await parseRowsFromFile(file);
      if (!rows.length) return err("No data rows found in file");
      await connectDB();
      const ownerId = req.user.id;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const batch = await Batch.findOneAndUpdate({ ownerId, date: today }, { $setOnInsert: { ownerId, date: today, label: `Batch ${today.toISOString().slice(0, 10)}`, status: "open", recordCount: 0 } }, { upsert: true, new: true });
      const [drives, existingIds, reporters] = await Promise.all([Drive.find({ ownerId }).lean(), ArchiveRecord.find({ ownerId, deletedAt: null }).select("videoId").lean(), Reporter.find({ ownerId, deletedAt: null }).lean()]);
      const driveMap = new Map(drives.map((drive) => [drive.label.toLowerCase(), drive]));
      const reporterMap = new Map(reporters.map((reporter) => [reporter.name.toLowerCase(), reporter]));
      const existing = new Set(existingIds.map((record) => record.videoId));
      const toInsert = []; const errors = []; let skipped = 0;
      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        if (!row.date || !row.videoId || !row.drive || !row.metadata) { errors.push({ row: rowNumber, reason: "Date, Video ID, Drive, and Metadata are required" }); continue; }
        const archiveDate = new Date(row.date);
        if (Number.isNaN(archiveDate.getTime())) { errors.push({ row: rowNumber, reason: `Invalid date: ${row.date}` }); continue; }
        if (existing.has(row.videoId)) { skipped += 1; continue; }
        const driveKey = row.drive.toLowerCase();
        let drive = driveMap.get(driveKey);
        if (!drive) {
          drive = await Drive.create({ ownerId, label: row.drive, isActive: true });
          driveMap.set(driveKey, drive);
        } else if (drive.deletedAt || !drive.isActive) {
          drive = await Drive.findByIdAndUpdate(drive._id, { deletedAt: null, isActive: true }, { new: true });
          driveMap.set(driveKey, drive);
        }
        let reporter = null;
        if (row.reporter) { reporter = reporterMap.get(row.reporter.toLowerCase()); if (!reporter) { reporter = await Reporter.create({ ownerId, name: row.reporter }); reporterMap.set(row.reporter.toLowerCase(), reporter); } }
        existing.add(row.videoId);
        toInsert.push({ videoId: row.videoId, archiveDate, driveId: drive._id, driveLabel: drive.label, reporterId: reporter?._id, reporterName: reporter?.name || "", metadata: row.metadata, ownerId, batchId: batch._id, status: "committed" });
      }
      const insertedDocs = toInsert.length ? await ArchiveRecord.insertMany(toInsert, { ordered: false }) : [];
      if (insertedDocs.length) await Batch.findByIdAndUpdate(batch._id, { $inc: { recordCount: insertedDocs.length } });
      await ActivityLog.create({ userId: ownerId, username: req.user.username, action: "IMPORT", meta: { total: rows.length, inserted: insertedDocs.length, skipped, errors: errors.length } });
      return ok({ total: rows.length, inserted: insertedDocs.length, skipped, errors });
    } catch (e) {
      if (e.code === 11000) return err("Some Video IDs already exist. Please retry the import.", 409);
      if (e instanceof SyntaxError) return err("Invalid JSON file");
      if (e.message?.includes("File") || e.message?.includes("JSON") || e.message?.includes("Spreadsheet") || e.message?.includes("rows")) return err(e.message, 400);
      return serverError(e);
    }
  }, { requireWrite: true });
}
