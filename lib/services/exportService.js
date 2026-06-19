import { connectDB } from '../db/mongoose';
import ArchiveRecord from '../db/models/ArchiveRecord';

function pickFields(r) {
  return { 'Video ID': r.videoId, 'Drive': r.driveLabel, 'Reporter': r.reporterName, 'Metadata': r.metadata };
}

export async function exportToJSON(ownerId, filter = {}) {
  await connectDB();
  const records = await ArchiveRecord.find({ ownerId, deletedAt: null, ...filter })
    .sort({ createdAt: -1 }).lean();
  return JSON.stringify(records.map(pickFields), null, 2);
}

export async function exportToCSV(ownerId, filter = {}) {
  await connectDB();
  const records = await ArchiveRecord.find({ ownerId, deletedAt: null, ...filter })
    .sort({ createdAt: -1 }).lean();
  const header = ['Video ID', 'Drive', 'Reporter', 'Metadata'];
  const rows = records.map(r => [r.videoId, r.driveLabel, r.reporterName, `"${(r.metadata||'').replace(/"/g,'""')}"`]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}
