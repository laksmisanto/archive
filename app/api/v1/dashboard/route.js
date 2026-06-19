import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import Batch from '@/lib/db/models/Batch';
import Reporter from '@/lib/db/models/Reporter';
import Drive from '@/lib/db/models/Drive';
import { ok, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const ownerId = req.user.id;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

      const [total, todayCount, reporterCount, driveCount, todayBatch, lastBatch] = await Promise.all([
        ArchiveRecord.countDocuments({ ownerId, deletedAt: null }),
        ArchiveRecord.countDocuments({ ownerId, deletedAt: null, createdAt: { $gte: today, $lt: tomorrow } }),
        Reporter.countDocuments({ ownerId, isActive: true, deletedAt: null }),
        Drive.countDocuments({ ownerId, isActive: true, deletedAt: null }),
        Batch.findOne({ ownerId, date: today, deletedAt: null }).lean(),
        Batch.findOne({ ownerId, deletedAt: null }).sort({ date: -1 }).lean(),
      ]);

      const now = new Date();
      const isPastSixPm = now.getHours() >= 18;
      const showWarning = isPastSixPm && (!todayBatch || todayBatch.recordCount === 0);

      return ok({ total, todayCount, reporterCount, driveCount, showWarning, lastBatch, todayBatch });
    } catch (e) { return serverError(e); }
  });
}
