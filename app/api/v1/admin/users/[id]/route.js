import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { ok, forbidden, notFound, serverError } from '@/lib/utils/apiResponse';

export async function PUT(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      if (req.user.role !== 'admin') return forbidden();
      await connectDB();
      const { isActive, role } = await req.json();
      const user = await User.findByIdAndUpdate(params.id, { isActive, role }, { new: true }).lean();
      if (!user) return notFound('User not found');
      return ok({ user });
    } catch (e) { return serverError(e); }
  });
}

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      if (req.user.role !== 'admin') return forbidden();
      await connectDB();
      const user = await User.findByIdAndUpdate(params.id, { deletedAt: new Date(), isActive: false }, { new: true });
      if (!user) return notFound('User not found');
      return ok({ message: 'User deactivated' });
    } catch (e) { return serverError(e); }
  });
}
