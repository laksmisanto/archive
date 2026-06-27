import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import Drive from '@/lib/db/models/Drive';
import { ok, notFound, serverError } from '@/lib/utils/apiResponse';

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { id } = await params;
      const d = await Drive.findOneAndUpdate(
        { _id: id, ownerId: req.user.id },
        { deletedAt: new Date(), isActive: false },
        { new: true }
      );
      if (!d) return notFound('Drive not found');
      return ok({ message: 'Drive removed' });
    } catch (e) { return serverError(e); }
  });
}
