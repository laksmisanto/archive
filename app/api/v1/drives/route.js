import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Drive from '@/lib/db/models/Drive';
import { ok, created, err, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const drives = await Drive.find({ ownerId: req.user.id, deletedAt: null, isActive: true }).sort({ label: 1 }).lean();
      return ok({ drives });
    } catch (e) { return serverError(e); }
  });
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { label, location } = await req.json();
      if (!label?.trim()) return err('Drive label is required');
      const drive = await Drive.create({ label: label.trim(), location: location?.trim(), ownerId: req.user.id });
      return created({ drive });
    } catch (e) {
      if (e.code === 11000) return err('Drive already exists', 409);
      return serverError(e);
    }
  });
}
