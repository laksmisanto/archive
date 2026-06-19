import { withAuth } from '@/lib/middleware/auth';
import { connectDB } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import { ok, serverError } from '@/lib/utils/apiResponse';

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const user = await User.findById(req.user.id).lean();
      return ok({ user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (e) { return serverError(e); }
  });
}
