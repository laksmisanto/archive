import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import Batch from '@/lib/db/models/Batch';
import { ok, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      if (req.user.role !== 'admin') return ok({ error: 'Admin only' }, 403);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const [totalUsers, totalRecords, todayRecords, activeBatches] = await Promise.all([
        User.countDocuments({ isActive: true, deletedAt: null }),
        ArchiveRecord.countDocuments({ deletedAt: null }),
        ArchiveRecord.countDocuments({ deletedAt: null, createdAt: { $gte: today, $lt: tomorrow } }),
        Batch.countDocuments({ status: 'open', deletedAt: null }),
      ]);
      return ok({ totalUsers, totalRecords, todayRecords, activeBatches });
    } catch (e) { return serverError(e); }
  });
}
