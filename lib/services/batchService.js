import { connectDB } from '../db/mongoose';
import Batch from '../db/models/Batch';
import ArchiveRecord from '../db/models/ArchiveRecord';

function todayMidnight() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export async function getOrCreateTodayBatch(ownerId) {
  await connectDB();
  const today = todayMidnight();
  const label = `Batch ${formatDate(today)}`;
  let batch = await Batch.findOne({ ownerId, date: today, deletedAt: null });
  if (!batch) batch = await Batch.create({ ownerId, date: today, label, status: 'open' });
  return batch;
}

export async function getBatches(ownerId) {
  await connectDB();
  return Batch.find({ ownerId, deletedAt: null }).sort({ date: -1 }).lean();
}

export async function getBatch(id, ownerId) {
  await connectDB();
  return Batch.findOne({ _id: id, ownerId, deletedAt: null }).lean();
}

export async function commitBatch(id, ownerId) {
  await connectDB();
  return Batch.findOneAndUpdate(
    { _id: id, ownerId, status: 'open', deletedAt: null },
    { status: 'committed', committedAt: new Date() },
    { new: true }
  );
}

export async function softDeleteBatch(id, ownerId) {
  await connectDB();
  const batch = await Batch.findOneAndUpdate(
    { _id: id, ownerId, deletedAt: null },
    { deletedAt: new Date() }, { new: true }
  );
  if (batch) {
    await ArchiveRecord.updateMany(
      { batchId: id, ownerId, deletedAt: null },
      { deletedAt: new Date() }
    );
  }
  return batch;
}

export async function checkTodayBatchWarning(ownerId) {
  await connectDB();
  const today = todayMidnight();
  const batch = await Batch.findOne({ ownerId, date: today, deletedAt: null });
  const now = new Date();
  const isPastSixPM = now.getHours() >= 18;
  return {
    show: isPastSixPM && (!batch || batch.recordCount === 0),
    batch,
  };
}
