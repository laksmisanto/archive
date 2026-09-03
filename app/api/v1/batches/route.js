import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Batch from '@/lib/db/models/Batch';
import { ok, created, serverError } from '@/lib/utils/apiResponse';

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const batches = await Batch.find({ ownerId: req.user.id, deletedAt: null }).sort({ date: -1 }).limit(100).lean();
      return ok({ batches });
    } catch (e) { return serverError(e); }
  }, { requireEditor: true });
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const today = todayMidnight();
      const label = `Batch ${today.toISOString().slice(0, 10)}`;
      const batch = await Batch.findOneAndUpdate(
        { ownerId: req.user.id, date: today },
        { $setOnInsert: { ownerId: req.user.id, date: today, label, status: 'open', recordCount: 0 } },
        { upsert: true, new: true }
      );
      return created({ batch });
    } catch (e) { return serverError(e); }
  }, { requireWrite: true });
}
