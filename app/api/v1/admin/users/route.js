import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';
import { ok, created, err, forbidden, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      if (req.user.role !== 'admin') return forbidden();
      await connectDB();
      const users = await User.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
      return ok({ users });
    } catch (e) { return serverError(e); }
  });
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      if (req.user.role !== 'admin') return forbidden();
      await connectDB();
      const { username, email, password, role } = await req.json();
      if (!username || !email || !password) return err('username, email, password required');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ username: username.toLowerCase().trim(), email: email.toLowerCase().trim(), passwordHash, role: role || 'user' });
      const { passwordHash: _, ...safe } = user.toObject();
      return created({ user: safe });
    } catch (e) {
      if (e.code === 11000) return err('Username or email already exists', 409);
      return serverError(e);
    }
  });
}
