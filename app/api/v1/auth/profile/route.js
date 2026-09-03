import bcrypt from 'bcryptjs';
import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { ok, err, serverError } from '@/lib/utils/apiResponse';

export async function PUT(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const body = await req.json();
      const updates = {};
      if (typeof body.username === 'string' && body.username.trim()) updates.username = body.username.trim().toLowerCase();
      if (typeof body.password === 'string' && body.password.length >= 6) updates.passwordHash = await bcrypt.hash(body.password, 12);
      if (req.user.role === 'admin' && typeof body.email === 'string' && body.email.trim()) updates.email = body.email.trim().toLowerCase();
      if (!Object.keys(updates).length) return err('Provide a valid username, password, or admin email');
      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).lean();
      return ok({ user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (e) {
      if (e.code === 11000) return err('Username or email already exists', 409);
      return serverError(e);
    }
  });
}
