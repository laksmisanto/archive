import { connectDB } from '../db/mongoose';
import ArchiveRecord from '../db/models/ArchiveRecord';
import Batch from '../db/models/Batch';
import Reporter from '../db/models/Reporter';
import Drive from '../db/models/Drive';

export async function getRecords({ ownerId, q, reporterId, driveId, batchId, page = 1, limit = 50 }) {
  await connectDB();
  const filter = { ownerId, deletedAt: null };
  if (q) filter.$text = { $search: q };
  if (reporterId) filter.reporterId = reporterId;
  if (driveId) filter.driveId = driveId;
  if (batchId) filter.batchId = batchId;

  const proj = q ? { score: { $meta: 'textScore' } } : {};
  const sort = q ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

  const [records, total] = await Promise.all([
    ArchiveRecord.find(filter, proj).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ArchiveRecord.countDocuments(filter),
  ]);
  return { records, total, page, pages: Math.ceil(total / limit) };
}

export async function createRecord({ ownerId, videoId, driveId, reporterId, metadata, batchId }) {
  await connectDB();
  const [drive, reporter] = await Promise.all([
    Drive.findOne({ _id: driveId, ownerId, deletedAt: null }),
    Reporter.findOne({ _id: reporterId, ownerId, deletedAt: null }),
  ]);
  if (!drive) throw new Error('Drive not found');
  if (!reporter) throw new Error('Reporter not found');

  const record = await ArchiveRecord.create({
    videoId, driveId, driveLabel: drive.label,
    reporterId, reporterName: reporter.name,
    metadata, ownerId, batchId, status: 'committed',
  });
  await Batch.findByIdAndUpdate(batchId, { $inc: { recordCount: 1 } });
  return record;
}

export async function updateRecord({ id, ownerId, ...updates }) {
  await connectDB();
  const allowed = {};
  if (updates.metadata) allowed.metadata = updates.metadata;
  if (updates.driveId) {
    const drive = await Drive.findOne({ _id: updates.driveId, ownerId, deletedAt: null });
    if (!drive) throw new Error('Drive not found');
    allowed.driveId = drive._id; allowed.driveLabel = drive.label;
  }
  if (updates.reporterId) {
    const reporter = await Reporter.findOne({ _id: updates.reporterId, ownerId, deletedAt: null });
    if (!reporter) throw new Error('Reporter not found');
    allowed.reporterId = reporter._id; allowed.reporterName = reporter.name;
  }
  return ArchiveRecord.findOneAndUpdate({ _id: id, ownerId, deletedAt: null }, allowed, { new: true });
}

export async function softDeleteRecord({ id, ownerId }) {
  await connectDB();
  const rec = await ArchiveRecord.findOneAndUpdate(
    { _id: id, ownerId, deletedAt: null },
    { deletedAt: new Date() }, { new: true }
  );
  if (rec) await Batch.findByIdAndUpdate(rec.batchId, { $inc: { recordCount: -1 } });
  return rec;
}

export async function checkDuplicate({ ownerId, videoId }) {
  await connectDB();
  const exists = await ArchiveRecord.findOne({ ownerId, videoId, deletedAt: null }).lean();
  return !!exists;
}

export async function getRecord({ id, ownerId }) {
  await connectDB();
  return ArchiveRecord.findOne({ _id: id, ownerId, deletedAt: null }).lean();
}
