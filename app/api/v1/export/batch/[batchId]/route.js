import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import ArchiveRecord from "@/lib/db/models/ArchiveRecord";
import Batch from "@/lib/db/models/Batch";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { serverError } from "@/lib/utils/apiResponse";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const validFormats = new Set(["csv", "json", "xlsx", "xls"]);

function serializeExportValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function GET(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const format = new URL(req.url).searchParams.get("format") || "csv";
      if (!validFormats.has(format)) {
        return new NextResponse(JSON.stringify({ message: "Unsupported export format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { batchId } = await params;

      const filter = { ownerId: req.user.id, deletedAt: null };
      if (batchId !== "all") filter.batchId = batchId;

      const records = await ArchiveRecord.find(filter)
        .select("videoId driveLabel reporterName metadata createdAt")
        .sort({ createdAt: -1 })
        .lean();

      const rows = records.map((r) => ({
        VideoID: serializeExportValue(r.videoId),
        Drive: serializeExportValue(r.driveLabel),
        Reporter: serializeExportValue(r.reporterName),
        Metadata: serializeExportValue(r.metadata),
      }));

      if (batchId !== "all") {
        await Batch.findOneAndUpdate(
          { _id: batchId, ownerId: req.user.id },
          { exportedAt: new Date() },
        );
      }

      await ActivityLog.create({
        userId: req.user.id,
        username: req.user.username,
        action: "EXPORT",
        meta: {
          format,
          count: rows.length,
          type: batchId === "all" ? "full" : "batch",
        },
      });

      const filename = batchId === "all" ? "full-archive" : `batch-${batchId}`;

      if (format === "csv") {
        const escape = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
        const header = "VideoID,Drive,Reporter,Metadata\r\n";
        const body = rows
          .map((r) =>
            [
              escape(r.VideoID),
              escape(r.Drive),
              escape(r.Reporter),
              escape(r.Metadata),
            ].join(","),
          )
          .join("\r\n");
        return new NextResponse(header + body, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
          },
        });
      }

      if (format === "xlsx" || format === "xls") {
        const sheet = XLSX.utils.json_to_sheet(rows, {
          header: ["VideoID", "Drive", "Reporter", "Metadata"],
        });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Archive");

        const bookType = format === "xlsx" ? "xlsx" : "xls";
        const buffer = new Uint8Array(
          XLSX.write(workbook, { bookType, type: "array" }),
        );

        return new NextResponse(buffer, {
          headers: {
            "Content-Type":
              format === "xlsx"
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "application/vnd.ms-excel",
            "Content-Disposition": `attachment; filename="${filename}.${format}"`,
          },
        });
      }

      return new NextResponse(JSON.stringify(rows, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    } catch (e) {
      return serverError(e);
    }
  }, { requireEditor: true });
}
