import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import Batch from '@/lib/db/models/Batch';
import ActivityLog from '@/lib/db/models/ActivityLog';
import { ok, err, notFound, serverError } from '@/lib/utils/apiResponse';

export async function GET(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const record = await ArchiveRecord.findOne({ _id: params.id, ownerId: req.user.id, deletedAt: null }).lean();
      if (!record) return notFound('Record not found');
      return ok({ record });
    } catch (e) { return serverError(e); }
  });
}

export async function PUT(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const body = await req.json();
      const { driveId, driveLabel, reporterId, reporterName, metadata } = body;
      const record = await ArchiveRecord.findOneAndUpdate(
        { _id: params.id, ownerId: req.user.id, deletedAt: null },
        { driveId, driveLabel, reporterId, reporterName, metadata },
        { new: true }
      );
      if (!record) return notFound('Record not found');
      await ActivityLog.create({ userId: req.user.id, username: req.user.username, action: 'EDIT', entityType: 'archiveRecord', entityId: record._id });
      return ok({ record });
    } catch (e) { return serverError(e); }
  });
}

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const record = await ArchiveRecord.findOneAndUpdate(
        { _id: params.id, ownerId: req.user.id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      );
      if (!record) return notFound('Record not found');
      if (record.batchId) {
        await Batch.findByIdAndUpdate(record.batchId, { $inc: { recordCount: -1 } });
      }
      await ActivityLog.create({ userId: req.user.id, username: req.user.username, action: 'DELETE', entityType: 'archiveRecord', entityId: record._id });
      return ok({ message: 'Record deleted' });
    } catch (e) { return serverError(e); }
  });
}
