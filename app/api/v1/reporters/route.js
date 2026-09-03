import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Reporter from '@/lib/db/models/Reporter';
import { ok, created, err, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const reporters = await Reporter.find({ ownerId: req.user.id, deletedAt: null }).sort({ name: 1 }).lean();
      return ok({ reporters });
    } catch (e) { return serverError(e); }
  });
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { name } = await req.json();
      if (!name?.trim()) return err('Reporter name is required');
      const reporter = await Reporter.create({ name: name.trim(), ownerId: req.user.id });
      return created({ reporter });
    } catch (e) {
      if (e.code === 11000) return err('Reporter already exists', 409);
      return serverError(e);
    }
  }, { requireWrite: true });
}
