import { connectDB } from '../db/mongoose';
import ArchiveRecord from '../db/models/ArchiveRecord';
import Batch from '../db/models/Batch';
import Reporter from '../db/models/Reporter';
import Drive from '../db/models/Drive';
import User from '../db/models/User';

export async function getUserStats(ownerId) {
  await connectDB();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [total, todayCount, reporters, drives, lastBatch] = await Promise.all([
    ArchiveRecord.countDocuments({ ownerId, deletedAt: null }),
    ArchiveRecord.countDocuments({ ownerId, deletedAt: null, createdAt: { $gte: today, $lt: tomorrow } }),
    Reporter.countDocuments({ ownerId, isActive: true, deletedAt: null }),
    Drive.countDocuments({ ownerId, isActive: true, deletedAt: null }),
    Batch.findOne({ ownerId, deletedAt: null, recordCount: { $gt: 0 } }).sort({ date: -1 }).lean(),
  ]);

  const now = new Date();
  const isPastSixPM = now.getHours() >= 18;
  const todayBatch = await Batch.findOne({ ownerId, date: today, deletedAt: null });
  const showWarning = isPastSixPM && (!todayBatch || todayBatch.recordCount === 0);

  return { total, todayCount, reporters, drives, lastBatch, showWarning };
}

export async function getAdminStats() {
  await connectDB();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const [totalRecords, todayRecords, totalUsers, totalReporters, totalDrives] = await Promise.all([
    ArchiveRecord.countDocuments({ deletedAt: null }),
    ArchiveRecord.countDocuments({ deletedAt: null, createdAt: { $gte: today, $lt: tomorrow } }),
    User.countDocuments({ deletedAt: null, isActive: true }),
    Reporter.countDocuments({ deletedAt: null, isActive: true }),
    Drive.countDocuments({ deletedAt: null, isActive: true }),
  ]);
  return { totalRecords, todayRecords, totalUsers, totalReporters, totalDrives };
}
