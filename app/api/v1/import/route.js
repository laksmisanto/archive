import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import Reporter from '@/lib/db/models/Reporter';
import Drive from '@/lib/db/models/Drive';
import Batch from '@/lib/db/models/Batch';
import ActivityLog from '@/lib/db/models/ActivityLog';
import { ok, err, serverError } from '@/lib/utils/apiResponse';

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) return err('No file provided');

      const ext = file.name.split('.').pop().toLowerCase();
      if (!['json', 'csv'].includes(ext)) return err('Only JSON and CSV files are supported');

      const text = await file.text();
      let rows = [];

      if (ext === 'json') {
        try { rows = JSON.parse(text); } catch { return err('Invalid JSON file'); }
        if (!Array.isArray(rows)) return err('JSON must be an array of objects');
      } else {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return err('CSV must have a header row and at least one data row');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        rows = lines.slice(1).map(line => {
          const values = line.match(/(".*?"|[^,]+)/g) || [];
          const row = {};
          headers.forEach((h, i) => { row[h] = (values[i] || '').replace(/"/g, '').trim(); });
          return row;
        });
      }

      const ownerId = req.user.id;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let batch = await Batch.findOneAndUpdate(
        { ownerId, date: today },
        { $setOnInsert: { ownerId, date: today, label: `Batch ${today.toISOString().slice(0,10)}`, status: 'open', recordCount: 0 } },
        { upsert: true, new: true }
      );

      const [existingReporters, existingDrives, existingIds] = await Promise.all([
        Reporter.find({ ownerId, deletedAt: null }).lean(),
        Drive.find({ ownerId, deletedAt: null }).lean(),
        ArchiveRecord.find({ ownerId, deletedAt: null }).select('videoId').lean(),
      ]);

      const existingSet = new Set(existingIds.map(r => r.videoId));
      const reporterMap = Object.fromEntries(existingReporters.map(r => [r.name.toLowerCase(), r]));
      const driveMap = Object.fromEntries(existingDrives.map(d => [d.label.toLowerCase(), d]));

      const toInsert = [], errors = [], skipped = [];
      const normalizeField = (row, ...keys) => { for (const k of keys) { if (row[k]) return row[k]; } return ''; };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const videoId = normalizeField(row, 'videoid', 'video_id', 'video id', 'id').trim();
        const metadata = normalizeField(row, 'metadata', 'description', 'desc').trim();
        const reporterName = normalizeField(row, 'reporter', 'reportername').trim();
        const driveLabel = normalizeField(row, 'drive', 'drivelabel', 'drive_label', 'drive number').trim();

        if (!videoId) { errors.push({ row: i + 2, reason: 'Missing videoId' }); continue; }
        if (!metadata) { errors.push({ row: i + 2, reason: 'Missing metadata' }); continue; }
        if (existingSet.has(videoId)) { skipped.push(videoId); continue; }

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
        toInsert.push({ videoId, metadata, reporterId, reporterName, driveId, driveLabel, ownerId, batchId: batch._id, status: 'committed' });
      }

      let inserted = 0;
      if (toInsert.length > 0) {
        const result = await ArchiveRecord.insertMany(toInsert, { ordered: false }).catch(e => {
          if (e.insertedDocs) return { insertedCount: e.insertedDocs.length };
          throw e;
        });
        inserted = result.insertedCount || toInsert.length;
        await Batch.findByIdAndUpdate(batch._id, { $inc: { recordCount: inserted } });
      }

      await ActivityLog.create({ userId: ownerId, username: req.user.username, action: 'IMPORT', meta: { total: rows.length, inserted, skipped: skipped.length, errors: errors.length } });

      return ok({ total: rows.length, inserted, skipped: skipped.length, errors });
    } catch (e) { return serverError(e); }
  });
}
