import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import ArchiveRecord from '@/lib/db/models/ArchiveRecord';
import { ok, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const videoId = new URL(req.url).searchParams.get('videoId') || '';
      if (!videoId.trim()) return ok({ duplicate: false });
      const exists = await ArchiveRecord.findOne({ ownerId: req.user.id, videoId: videoId.trim(), deletedAt: null }).lean();
      return ok({ duplicate: !!exists, record: exists || null });
    } catch (e) { return serverError(e); }
  });
}
