import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import EditCardRecord from '@/lib/db/models/EditCardRecord';
import { serverError } from '@/lib/utils/apiResponse';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const validFormats = new Set(['csv', 'json', 'xlsx', 'xls']);

function serializeExportValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const format = new URL(req.url).searchParams.get('format') || 'csv';
      if (!validFormats.has(format)) {
        return new NextResponse(JSON.stringify({ message: 'Unsupported export format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const records = await EditCardRecord.find({ ownerId: req.user.id, deletedAt: null }).sort({ createdAt: -1 }).lean();
      const rows = records.map((record) => ({
        ID: serializeExportValue(record.entryId),
        Date: record.archiveDate ? new Date(record.archiveDate).toISOString().slice(0, 10) : '',
        Drive: serializeExportValue(record.drive),
        Metadata: serializeExportValue(record.metadata),
        Reporter: serializeExportValue(record.reporter),
        AssetType: serializeExportValue(record.assetType),
        Category: serializeExportValue(record.category),
        Quality: serializeExportValue(record.quality),
      }));
      const filename = 'edit-card-records';
      if (format === 'csv') {
        const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const header = 'ID,Date,Drive,Metadata,Reporter,AssetType,Category,Quality\r\n';
        const body = rows.map((row) => Object.values(row).map(escape).join(',')).join('\r\n');
        return new NextResponse(header + body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}.csv"` } });
      }
      if (format === 'xlsx' || format === 'xls') {
        const sheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Edit Card');
        const buffer = new Uint8Array(XLSX.write(workbook, { bookType: format, type: 'array' }));
        return new NextResponse(buffer, { headers: { 'Content-Type': format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.ms-excel', 'Content-Disposition': `attachment; filename="${filename}.${format}"` } });
      }
      return new NextResponse(JSON.stringify(rows, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${filename}.json"` } });
    } catch (error) { return serverError(error); }
  }, { requireEditor: true });
}
