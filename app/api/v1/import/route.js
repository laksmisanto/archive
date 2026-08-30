import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import ArchiveRecord from "@/lib/db/models/ArchiveRecord";
import Reporter from "@/lib/db/models/Reporter";
import Drive from "@/lib/db/models/Drive";
import Batch from "@/lib/db/models/Batch";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { ok, err, serverError } from "@/lib/utils/apiResponse";
import * as XLSX from "xlsx";

const SUPPORTED_EXTENSIONS = new Set(["json", "csv", "xlsx", "xls"]);

const parseRowsFromFile = async (file) => {
  const ext = file.name.split(".").pop().toLowerCase();
  const raw = await file.arrayBuffer();

  if (ext === "json") {
    const text = Buffer.from(raw).toString("utf8");
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed))
      throw new Error("JSON must be an array of objects");
    return parsed;
  }

  if (ext === "csv") {
    const text = Buffer.from(raw).toString("utf8");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    return lines.slice(1).map((line) => {
      const values = line.match(/(".*?"|[^,]+)/g) || [];
      const row = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] || "").replace(/"/g, "").trim();
      });
      return row;
    });
  }

  const workbook = XLSX.read(Buffer.from(raw), { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("Spreadsheet file is empty");

  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    defval: "",
    raw: false,
  });

  if (!Array.isArray(rows)) {
    throw new Error("Spreadsheet file could not be parsed");
  }

  return rows;
};

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file) return err("No file provided");

      const ext = file.name.split(".").pop().toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        return err("Only CSV, JSON, XLSX, and XLS files are supported");
      }

      let rows = [];
      try {
        rows = await parseRowsFromFile(file);
      } catch (e) {
        if (e.message === "JSON must be an array of objects") {
          return err(e.message);
        }
        if (
          e.message === "CSV must have a header row and at least one data row"
        ) {
          return err(e.message);
        }
        if (e.message === "Spreadsheet file is empty") {
          return err(e.message);
        }
        if (e.message === "Spreadsheet file could not be parsed") {
          return err(e.message);
        }
        return err("Invalid file format");
      }

      const ownerId = req.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let batch = await Batch.findOneAndUpdate(
        { ownerId, date: today },
        {
          $setOnInsert: {
            ownerId,
            date: today,
            label: `Batch ${today.toISOString().slice(0, 10)}`,
            status: "open",
            recordCount: 0,
          },
        },
        { upsert: true, new: true },
      );

      const [existingReporters, existingDrives, existingIds] =
        await Promise.all([
          Reporter.find({ ownerId, deletedAt: null }).lean(),
          Drive.find({ ownerId, deletedAt: null }).lean(),
          ArchiveRecord.find({ ownerId, deletedAt: null })
            .select("videoId")
            .lean(),
        ]);

      const existingSet = new Set(existingIds.map((r) => r.videoId));
      const reporterMap = Object.fromEntries(
        existingReporters.map((r) => [r.name.toLowerCase(), r]),
      );
      const driveMap = Object.fromEntries(
        existingDrives.map((d) => [d.label.toLowerCase(), d]),
      );

      const toInsert = [],
        errors = [],
        skipped = [];
      const normalizeField = (row, ...keys) => {
        for (const k of keys) {
          const value = row?.[k];
          if (
            value !== undefined &&
            value !== null &&
            `${value}`.trim() !== ""
          ) {
            return `${value}`;
          }
        }
        return "";
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const videoId = normalizeField(
          row,
          "videoid",
          "videoId",
          "Video ID",
          "video_id",
          "video id",
          "id",
          "ID",
        ).trim();
        const metadata = normalizeField(
          row,
          "metadata",
          "Metadata",
          "description",
          "desc",
          "Meta Data",
        ).trim();
        const rawDate = normalizeField(row, "date", "Date", "DATE").trim();
        const reporterName = normalizeField(
          row,
          "reporter",
          "reporterName",
          "reportername",
          "Reporter",
        ).trim();
        const driveLabel = normalizeField(
          row,
          "drive",
          "Drive",
          "driveName",
          "drivelabel",
          "drive_label",
          "drive number",
          "Drive Name",
        ).trim();

        if (!videoId) {
          errors.push({ row: i + 2, reason: "Missing videoId" });
          continue;
        }
        if (!metadata) {
          errors.push({ row: i + 2, reason: "Missing metadata" });
          continue;
        }
        if (!rawDate) {
          errors.push({ row: i + 2, reason: "Missing date" });
          continue;
        }
        const archiveDate = new Date(rawDate);
        if (Number.isNaN(archiveDate.getTime())) {
          errors.push({ row: i + 2, reason: `Invalid date: ${rawDate}` });
          continue;
        }
        if (existingSet.has(videoId)) {
          skipped.push(videoId);
          continue;
        }

        let reporterId = null;
        if (reporterName) {
          let reporter = reporterMap[reporterName.toLowerCase()];
          if (!reporter) {
            reporter = await Reporter.create({ name: reporterName, ownerId });
            reporterMap[reporterName.toLowerCase()] = reporter;
          }
          reporterId = reporter._id;
        }

        let driveId = null;
        if (driveLabel) {
          const drive = driveMap[driveLabel.toLowerCase()];
          if (drive) driveId = drive._id;
        }

        existingSet.add(videoId);
        toInsert.push({
          videoId,
          archiveDate,
          metadata,
          reporterId,
          reporterName,
          driveId,
          driveLabel,
          ownerId,
          batchId: batch._id,
          status: "committed",
        });
      }

      let inserted = 0;
      if (toInsert.length > 0) {
        const result = await ArchiveRecord.insertMany(toInsert, {
          ordered: false,
        }).catch((e) => {
          if (e.insertedDocs) return { insertedCount: e.insertedDocs.length };
          throw e;
        });
        inserted = result.insertedCount || toInsert.length;
        await Batch.findByIdAndUpdate(batch._id, {
          $inc: { recordCount: inserted },
        });
      }

      await ActivityLog.create({
        userId: ownerId,
        username: req.user.username,
        action: "IMPORT",
        meta: {
          total: rows.length,
          inserted,
          skipped: skipped.length,
          errors: errors.length,
        },
      });

      return ok({
        total: rows.length,
        inserted,
        skipped: skipped.length,
        errors,
      });
    } catch (e) {
      return serverError(e);
    }
  });
}
