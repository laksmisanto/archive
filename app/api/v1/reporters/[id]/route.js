import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Reporter from '@/lib/db/models/Reporter';
import { ok, notFound, serverError } from '@/lib/utils/apiResponse';

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { id } = await params;
      const r = await Reporter.findOneAndUpdate(
        { _id: id, ownerId: req.user.id },
        { deletedAt: new Date(), isActive: false },
        { new: true }
      );
      if (!r) return notFound('Reporter not found');
      return ok({ message: 'Reporter removed' });
    } catch (e) { return serverError(e); }
  });
}
