import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import ActivityLog from '@/lib/db/models/ActivityLog';
import { ok, forbidden, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      if (req.user.role !== 'admin') return forbidden();
      await connectDB();
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
      const limit = 50;
      const [logs, total] = await Promise.all([
        ActivityLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ActivityLog.countDocuments(),
      ]);
      return ok({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (e) { return serverError(e); }
  });
}
