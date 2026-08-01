import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import EditCardRecord from "@/lib/db/models/EditCardRecord";
import { ok, serverError } from "@/lib/utils/apiResponse";

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
      const q = searchParams.get("q") || "";

      const filter = { ownerId: req.user.id, deletedAt: null };

      if (q) {
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const keywords = q.trim().split(/\s+/).filter(Boolean);
        filter.$and = keywords.map((kw) => {
          const re = new RegExp(escapeRegex(kw), "i");
          return { $or: [{ entryId: re }, { metadata: re }] };
        });
      }

      const [records, total] = await Promise.all([
        EditCardRecord.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        EditCardRecord.countDocuments(filter),
      ]);

      return ok({ records, total, page, pages: Math.ceil(total / limit), limit });
    } catch (e) {
      return serverError(e);
    }
  });
}
