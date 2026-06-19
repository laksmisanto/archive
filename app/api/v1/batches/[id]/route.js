import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Batch from '@/lib/db/models/Batch';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import { ok, notFound, serverError } from '@/lib/utils/apiResponse';

export async function GET(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const batch = await Batch.findOne({ _id: params.id, ownerId: req.user.id, deletedAt: null }).lean();
      if (!batch) return notFound('Batch not found');
      return ok({ batch });
    } catch (e) { return serverError(e); }
  });
}

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const now = new Date();
      const batch = await Batch.findOneAndUpdate({ _id: params.id, ownerId: req.user.id, deletedAt: null }, { deletedAt: now }, { new: true });
      if (!batch) return notFound('Batch not found');
      await ArchiveRecord.updateMany({ batchId: params.id, ownerId: req.user.id, deletedAt: null }, { deletedAt: now });
      return ok({ message: 'Batch and records deleted' });
    } catch (e) { return serverError(e); }
  });
}
