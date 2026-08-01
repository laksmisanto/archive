import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import EditCardRecord from "@/lib/db/models/EditCardRecord";
import { ok, err, serverError } from "@/lib/utils/apiResponse";

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { id } = params;
      const record = await EditCardRecord.findOneAndUpdate(
        { _id: id, ownerId: req.user.id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true },
      );
      if (!record) return err("Record not found", 404);
      return ok({ record });
    } catch (e) {
      return serverError(e);
    }
  });
}
