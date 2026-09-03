import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Batch from '@/lib/db/models/Batch';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import ActivityLog from '@/lib/db/models/ActivityLog';
import { ok, notFound, serverError } from '@/lib/utils/apiResponse';

export async function POST(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { id } = await params;
      const batch = await Batch.findOne({ _id: id, ownerId: req.user.id, status: 'open', deletedAt: null });
      if (!batch) return notFound('Open batch not found');
      batch.status = 'committed';
      batch.committedAt = new Date();
      await batch.save();
      await ArchiveRecord.updateMany({ batchId: id, ownerId: req.user.id, status: 'draft', deletedAt: null }, { status: 'committed' });
      await ActivityLog.create({ userId: req.user.id, username: req.user.username, action: 'COMMIT', entityType: 'batch', entityId: batch._id, meta: { recordCount: batch.recordCount } });
      return ok({ batch });
    } catch (e) { return serverError(e); }
  }, { requireWrite: true });
}
