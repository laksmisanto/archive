import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import Batch from '@/lib/db/models/Batch';
import ActivityLog from '@/lib/db/models/ActivityLog';
import { ok, created, err, serverError } from '@/lib/utils/apiResponse';
/*
export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
      const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
      const q = searchParams.get('q') || '';
      const batchId = searchParams.get('batchId') || '';
      const reporter = searchParams.get('reporter') || '';
      const drive = searchParams.get('drive') || '';

      const filter = { ownerId: req.user.id, deletedAt: null };
      if (q) filter.$text = { $search: q };
      if (batchId) filter.batchId = batchId;
      if (reporter) filter.reporterName = { $regex: reporter, $options: 'i' };
      if (drive) filter.driveLabel = { $regex: drive, $options: 'i' };

      const sort = q ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
      const projection = q ? { score: { $meta: 'textScore' } } : {};

      const [records, total] = await Promise.all([
        ArchiveRecord.find(filter, projection).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        ArchiveRecord.countDocuments(filter),
      ]);

      return ok({ records, total, page, pages: Math.ceil(total / limit), limit });
    } catch (e) { return serverError(e); }
  });
}
*/

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
      const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
      const q = searchParams.get('q') || '';
      const batchId = searchParams.get('batchId') || '';
      const reporter = searchParams.get('reporter') || '';
      const drive = searchParams.get('drive') || '';

      const filter = { ownerId: req.user.id, deletedAt: null };

      if (q) {
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keywords = q.trim().split(/\s+/).filter(Boolean);

        // every keyword must match at least one field (AND keywords, OR fields)
        filter.$and = keywords.map((kw) => {
          const re = new RegExp(escapeRegex(kw), 'i');
          return {
            $or: [
              { videoId: re },
              { driveLabel: re },
              { reporterName: re },
              { metadata: re },
            ],
          };
        });
      }

      if (batchId) filter.batchId = batchId;
      if (reporter) filter.reporterName = { $regex: reporter, $options: 'i' };
      if (drive) filter.driveLabel = { $regex: drive, $options: 'i' };

      const sort = { createdAt: -1 };

      const [records, total] = await Promise.all([
        ArchiveRecord.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
        ArchiveRecord.countDocuments(filter),
      ]);

      return ok({ records, total, page, pages: Math.ceil(total / limit), limit });
    } catch (e) { return serverError(e); }
  });
}


export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const body = await req.json();
      const { videoId, driveId, driveLabel, reporterId, reporterName, metadata, batchId } = body;

      if (!videoId || !metadata) return err('videoId and metadata are required');

      const record = await ArchiveRecord.create({
        videoId: videoId.trim(),
        driveId, driveLabel, reporterId, reporterName,
        metadata: metadata.trim(),
        ownerId: req.user.id,
        batchId,
        status: 'committed',
      });

      if (batchId) {
        await Batch.findByIdAndUpdate(batchId, { $inc: { recordCount: 1 }, updatedAt: new Date() });
      }

      await ActivityLog.create({ userId: req.user.id, username: req.user.username, action: 'CREATE', entityType: 'archiveRecord', entityId: record._id });

      return created({ record });
    } catch (e) {
      if (e.code === 11000) return err('Duplicate Video ID — this record already exists for your account', 409);
      return serverError(e);
    }
  });
}
