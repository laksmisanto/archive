import { connectDB } from '../db/mongoose';
import ArchiveRecord from '../db/models/ArchiveRecord';
import Reporter from '../db/models/Reporter';
import Drive from '../db/models/Drive';

export async function processImport({ ownerId, batchId, rows }) {
  await connectDB();

  // Load existing videoIds for duplicate detection
  const existing = await ArchiveRecord.find({ ownerId, deletedAt: null }, { videoId: 1 }).lean();
  const existingSet = new Set(existing.map(r => r.videoId));

  // Load reporters and drives
  const [reporterList, driveList] = await Promise.all([
    Reporter.find({ ownerId, deletedAt: null }).lean(),
    Drive.find({ ownerId, deletedAt: null }).lean(),
  ]);
  const reporterMap = Object.fromEntries(reporterList.map(r => [r.name.toLowerCase(), r]));
  const driveMap = Object.fromEntries(driveList.map(d => [d.label.toLowerCase(), d]));

  const toInsert = [], skipped = [], errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const videoId = (row['Video ID'] || row['videoId'] || row['video_id'] || '').trim();
    const driveName = (row['Drive'] || row['drive'] || row['driveLabel'] || '').trim();
    const reporterName = (row['Reporter'] || row['reporter'] || row['reporterName'] || '').trim();
    const metadata = (row['Metadata'] || row['metadata'] || '').trim();

    if (!videoId) { errors.push({ row: i + 2, reason: 'Missing Video ID' }); continue; }
    if (!metadata) { errors.push({ row: i + 2, reason: 'Missing Metadata' }); continue; }

    if (existingSet.has(videoId)) { skipped.push({ row: i + 2, videoId, reason: 'Duplicate' }); continue; }
    existingSet.add(videoId);

    const drive = driveMap[driveName.toLowerCase()];
    if (!drive) { errors.push({ row: i + 2, reason: `Drive not found: ${driveName}` }); continue; }

    let reporter = reporterMap[reporterName.toLowerCase()];
    if (!reporter) {
      // Auto-create reporter
      reporter = await Reporter.create({ name: reporterName, ownerId });
      reporterMap[reporterName.toLowerCase()] = reporter;
    }

    toInsert.push({ videoId, driveId: drive._id, driveLabel: drive.label,
      reporterId: reporter._id, reporterName: reporter.name, metadata, ownerId, batchId, status: 'committed' });
  }

  let inserted = 0;
  if (toInsert.length) {
    const result = await ArchiveRecord.insertMany(toInsert, { ordered: false }).catch(e => {
      if (e.code === 11000) return { insertedCount: e.insertedDocs?.length || 0 };
      throw e;
    });
    inserted = result.insertedCount ?? toInsert.length;
  }

  return { total: rows.length, inserted, skipped: skipped.length, errors };
}
