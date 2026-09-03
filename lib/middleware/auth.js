import { verifyToken } from '@/lib/auth/jwt';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { unauthorized, forbidden } from '@/lib/utils/apiResponse';

export async function withAuth(request, handler, { requireRole, requireWrite = false, requireEditor = false } = {}) {
  const token = request.cookies.get('nams_token')?.value;
  if (!token) return unauthorized();

  const decoded = verifyToken(token);
  if (!decoded) return unauthorized();

  await connectDB();
  const user = await User.findOne({ _id: decoded.sub, isActive: true, deletedAt: null }).lean();
  if (!user) return unauthorized();

  if (requireRole && requireRole === 'admin' && user.role !== 'admin') return forbidden();
  if (requireEditor && !['admin', 'editor'].includes(user.role)) return forbidden();
  if (requireWrite && user.role === 'user') return forbidden();

  request.user = { id: user._id.toString(), role: user.role, username: user.username };
  return handler(request);
}
