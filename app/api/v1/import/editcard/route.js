import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import EditCardRecord from "@/lib/db/models/EditCardRecord";
import Drive from "@/lib/db/models/Drive";
import Reporter from "@/lib/db/models/Reporter";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { ok, err, serverError } from "@/lib/utils/apiResponse";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 200_000;
const SUPPORTED_EXTENSIONS = new Set(["json", "csv", "xlsx", "xls", "txt"]);

const fieldAliases = {
  archiveDate: ["archive date", "date", "archivedate"],
  entryId: ["id", "entry id", "entryid", "video id", "videoid"],
  drive: ["drive", "drive label", "drivelabel", "drive number", "drive no"],
  metadata: ["metadata", "description", "desc", "meta data"],
  reporter: ["reporter", "reporter name", "reportername"],
  assetType: ["asset type", "assettype", "type", "asset_type"],
  quality: ["quality", "quality rating"],
  category: ["category", "news category", "newscategory"],
};

const normal = (value) => String(value ?? "").trim();
const assetTypeValue = (value) => {
  const code = normal(value).toUpperCase();
  return code === "GV" ? "GVW" : code;
};
const categoryValue = (value) => normal(value).toUpperCase();
const qualityValue = (value) => normal(value).toUpperCase();
const categories = ["SPORT", "BUSINESS", "WEATHER", "SCIENCE", "POLITICAL", "CRIME", "OTHER"];
const qualityOptions = ["SD", "HD", "FHD", "2K", "4K", "8K"];
const normalHeader = (value) =>
  normal(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function pickFirstValue(row, aliases) {
  const source = row && typeof row === "object" ? row : {};
  for (const alias of aliases) {
    const key = Object.keys(source).find((k) => normalHeader(k) === alias);
    if (key !== undefined) return source[key];
  }
  return "";
}

function buildRowFromObject(row) {
  return {
    archiveDate: pickFirstValue(row, fieldAliases.archiveDate),
    entryId: pickFirstValue(row, fieldAliases.entryId),
    drive: pickFirstValue(row, fieldAliases.drive),
    metadata: pickFirstValue(row, fieldAliases.metadata),
    reporter: pickFirstValue(row, fieldAliases.reporter),
    assetType: pickFirstValue(row, fieldAliases.assetType),
    quality: pickFirstValue(row, fieldAliases.quality),
    category: pickFirstValue(row, fieldAliases.category),
  };
}

function mapRows(rows) {
  if (!rows.length) return [];

  const firstRow = Array.isArray(rows[0]) ? rows[0] : [];
  const headers = firstRow.map(normalHeader);
  const hasHeaders = headers.some((header) =>
    Object.values(fieldAliases)
      .flat()
      .includes(header),
  );

  const getIndex = (field, fallback = 0) => {
    const aliases = fieldAliases[field] || [];
    const foundIndex = headers.findIndex((header) => aliases.includes(header));
    return foundIndex >= 0 ? foundIndex : fallback;
  };

  const dataRows = hasHeaders ? rows.slice(1) : rows;

  return dataRows
    .filter((row) => {
      if (!Array.isArray(row) && row && typeof row === "object") return Object.keys(row).length > 0;
      return Array.isArray(row) && row.some((value) => normal(value));
    })
    .map((row) => {
      if (!Array.isArray(row) && row && typeof row === "object") {
        return buildRowFromObject(row);
      }

      const normalizedRow = Array.isArray(row) ? row : [];
      const indexes = {
        archiveDate: getIndex("archiveDate", 0),
        entryId: getIndex("entryId", 1),
        drive: getIndex("drive", 2),
        metadata: getIndex("metadata", 3),
        reporter: getIndex("reporter", 4),
        assetType: getIndex("assetType", 5),
        quality: getIndex("quality", 6),
        category: getIndex("category", 7),
      };

      return {
        archiveDate: normal(normalizedRow[indexes.archiveDate]),
        entryId: normal(normalizedRow[indexes.entryId]),
        drive: normal(normalizedRow[indexes.drive]),
        metadata: normal(normalizedRow[indexes.metadata]),
        reporter: normal(normalizedRow[indexes.reporter]),
        assetType: normal(normalizedRow[indexes.assetType]),
        quality: normal(normalizedRow[indexes.quality]),
        category: normal(normalizedRow[indexes.category]),
      };
    });
}

async function parseRows(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error("Only CSV, JSON, XLSX, XLS, and TXT files are supported");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (maximum 10 MB)");
  }

  const raw = await file.arrayBuffer();
  let rows;

  if (ext === "json") {
    const parsed = JSON.parse(Buffer.from(raw).toString("utf8"));
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array");

    rows = parsed.map((row) => {
      if (typeof row === "string") return ["", "", "", row];
      if (Array.isArray(row)) return row;
      return buildRowFromObject(row);
    });
  } else if (ext === "txt") {
    rows = Buffer.from(raw)
      .toString("utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ["", "", "", line]);
  } else if (ext === "csv") {
    rows = parse(Buffer.from(raw).toString("utf8"), {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });
  } else {
    const workbook = XLSX.read(Buffer.from(raw), { type: "buffer", dense: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("Spreadsheet file is empty");
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  }

  const mapped = mapRows(rows);
  if (mapped.length > MAX_ROWS) {
    throw new Error(`File has too many rows (maximum ${MAX_ROWS.toLocaleString()})`);
  }

  return mapped;
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      const contentLength = Number(req.headers.get("content-length") || 0);
      if (contentLength > MAX_FILE_BYTES + 100_000) {
        return err("File is too large (maximum 10 MB)", 413);
      }

      const file = (await req.formData()).get("file");
      if (!file || typeof file.arrayBuffer !== "function") {
        return err("No file provided");
      }

      const rows = await parseRows(file);
      if (!rows.length) return err("No data rows found in file");

      await connectDB();
      const ownerId = req.user.id;
      const [drives, reporters, existing] = await Promise.all([
        Drive.find({ ownerId, deletedAt: null, isActive: true }).lean(),
        Reporter.find({ ownerId, deletedAt: null, isActive: true }).lean(),
        EditCardRecord.find({ ownerId }).select("entryId").lean(),
      ]);
      const entryIdSet = new Set(existing.map((record) => record.entryId.trim().toLowerCase()));
      const driveMap = new Map(drives.map((drive) => [drive.label.trim().toLowerCase(), drive.label.trim()]));
      const reporterMap = new Map(reporters.map((reporter) => [reporter.name.trim().toLowerCase(), reporter.name.trim()]));

      const toInsert = [];
      const errors = [];
      let skipped = 0;

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;

        if (!row.entryId) {
          errors.push({ row: rowNumber, reason: "ID is required when importing Edit Card records" });
          continue;
        }

        if (!row.metadata) {
          errors.push({ row: rowNumber, reason: "Metadata is required" });
          continue;
        }

        if (!row.drive) {
          errors.push({ row: rowNumber, reason: "Drive is required" });
          continue;
        }

        const driveKey = row.drive.trim().toLowerCase();
        if (!driveMap.has(driveKey)) {
          errors.push({ row: rowNumber, reason: `Drive "${row.drive}" does not exist in the configured drives list` });
          continue;
        }

        if (row.reporter && !reporterMap.has(row.reporter.trim().toLowerCase())) {
          errors.push({ row: rowNumber, reason: `Reporter "${row.reporter}" does not exist in the configured reporters list` });
          continue;
        }

        const assetType = assetTypeValue(row.assetType);
        if (!assetType || !/^[A-Z0-9]{3}$/.test(assetType)) {
          errors.push({ row: rowNumber, reason: "Asset type is required and must be a 3-character code" });
          continue;
        }

        const category = categoryValue(row.category || "OTHER");
        if (!categories.includes(category)) {
          errors.push({ row: rowNumber, reason: `Category must be one of: ${categories.join(", ")}` });
          continue;
        }

        const quality = qualityValue(row.quality || "");
        if (row.quality && !qualityOptions.includes(quality)) {
          errors.push({ row: rowNumber, reason: `Quality must be one of: ${qualityOptions.join(", ")}` });
          continue;
        }

        if (row.metadata.length > 10000) {
          errors.push({ row: rowNumber, reason: "Metadata must be 10,000 characters or fewer" });
          continue;
        }

        const archiveDate = row.archiveDate ? new Date(row.archiveDate) : null;
        if (row.archiveDate && archiveDate && Number.isNaN(archiveDate.getTime())) {
          errors.push({ row: rowNumber, reason: `Invalid date: ${row.archiveDate}` });
          continue;
        }

        const entryIdKey = row.entryId.toLowerCase();
        if (entryIdSet.has(entryIdKey)) {
          skipped += 1;
          continue;
        }

        entryIdSet.add(entryIdKey);
        toInsert.push({
          entryId: row.entryId,
          archiveDate: archiveDate && !Number.isNaN(archiveDate.getTime()) ? archiveDate : null,
          drive: driveMap.get(driveKey),
          metadata: row.metadata,
          reporter: row.reporter ? reporterMap.get(row.reporter.trim().toLowerCase()) : "",
          assetType,
          category,
          quality: quality || "",
          ownerId,
        });
      }

      let insertedDocs = [];
      if (toInsert.length) {
        try {
          insertedDocs = await EditCardRecord.insertMany(toInsert, { ordered: false });
        } catch (error) {
          insertedDocs = error.insertedDocs || [];
          const duplicateCount = error.writeErrors?.filter((item) => item.code === 11000).length || 0;
          skipped += duplicateCount;
          if (error.writeErrors?.some((item) => item.code !== 11000)) throw error;
        }
      }

      await ActivityLog.create({
        userId: ownerId,
        username: req.user.username,
        action: "IMPORT",
        entityType: "EditCardRecord",
        meta: {
          total: rows.length,
          inserted: insertedDocs.length,
          skipped,
          errors: errors.length,
        },
      });

      return ok({ total: rows.length, inserted: insertedDocs.length, skipped, errors });
    } catch (e) {
      if (e.code === 11000) return err("Duplicate Edit Card records were skipped; the remaining rows were imported.");
      if (e instanceof SyntaxError) return err("Invalid JSON file");
      if (
        e.message?.includes("File") ||
        e.message?.includes("JSON") ||
        e.message?.includes("Spreadsheet") ||
        e.message?.includes("rows")
      ) {
        return err(e.message, 400);
      }
      return serverError(e);
    }
  }, { requireWrite: true });
}
