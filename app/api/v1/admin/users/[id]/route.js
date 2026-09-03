import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { ok, forbidden, notFound, serverError } from '@/lib/utils/apiResponse';

export async function PUT(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      if (req.user.role !== 'admin') return forbidden();
      await connectDB();
      const { id } = await params;
      const { isActive, role, username, email } = await req.json();
      const updates = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (role !== undefined) { if (!['admin', 'editor', 'user'].includes(role)) return err('Invalid role'); updates.role = role; }
      if (typeof username === 'string' && username.trim()) updates.username = username.trim().toLowerCase();
      if (typeof email === 'string' && email.trim()) updates.email = email.trim().toLowerCase();
      const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
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
      const { id } = await params;
      const user = await User.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false }, { new: true });
      if (!user) return notFound('User not found');
      return ok({ message: 'User deactivated' });
    } catch (e) { return serverError(e); }
  });
}
