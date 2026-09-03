import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import EditCardRecord from "@/lib/db/models/EditCardRecord";
import Drive from "@/lib/db/models/Drive";
import Reporter from "@/lib/db/models/Reporter";
import { ok, err, serverError } from "@/lib/utils/apiResponse";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const categoryOptions = ["SPORT", "BUSINESS", "WEATHER", "SCIENCE", "POLITICAL", "CRIME", "OTHER"];
const qualityOptions = ["SD", "HD", "FHD", "2K", "4K", "8K"];

const assetTypeValue = (value) => {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return code === "GV" ? "GVW" : code;
};
const categoryValue = (value) => typeof value === "string" ? value.trim().toUpperCase() : "";
const qualityValue = (value) => typeof value === "string" ? value.trim().toUpperCase() : "";

export async function DELETE(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { id } = await params;
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
  }, { requireWrite: true });
}

export async function PUT(request, { params }) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { id } = await params;
      const body = await req.json();
      const metadata = typeof body.metadata === "string" ? body.metadata.trim() : "";
      const drive = typeof body.drive === "string" ? body.drive.trim() : "";
      const assetType = assetTypeValue(body.assetType);
      const category = categoryValue(body.category);
      const quality = qualityValue(body.quality);
      const [driveExists, reporterExists] = await Promise.all([
        Drive.findOne({ ownerId: req.user.id, label: new RegExp(`^${escapeRegex(drive)}$`, "i"), deletedAt: null, isActive: true }).lean(),
        body.reporter ? Reporter.findOne({ ownerId: req.user.id, name: new RegExp(`^${escapeRegex(body.reporter.trim())}$`, "i"), deletedAt: null, isActive: true }).lean() : null,
      ]);
      if (!metadata) return err("Metadata is required");
      if (!drive) return err("Drive is required");
      if (!driveExists) return err("Drive must match an existing drive in the system");
      if (!assetType || !/^[A-Z0-9]{3}$/.test(assetType)) return err("Asset type is required and must be a 3-character code");
      if (!category || !categoryOptions.includes(category)) return err(`Category is required and must be one of: ${categoryOptions.join(", ")}`);
      if (body.quality && !qualityOptions.includes(quality)) return err(`Quality must be one of: ${qualityOptions.join(", ")}`);
      if (body.reporter && !reporterExists) return err("Reporter must match an existing reporter in the system");
      if (metadata.length > 10000) return err("Metadata must be 10,000 characters or fewer");
      const archiveDate = body.archiveDate ? new Date(body.archiveDate) : null;
      if (archiveDate && Number.isNaN(archiveDate.getTime())) return err("Invalid date");
      const record = await EditCardRecord.findOneAndUpdate(
        { _id: id, ownerId: req.user.id, deletedAt: null },
        {
          entryId: typeof body.entryId === "string" && body.entryId.trim() ? body.entryId.trim() : undefined,
          archiveDate,
          metadata,
          drive: driveExists.label,
          reporter: typeof body.reporter === "string" ? body.reporter.trim() : "",
          assetType,
          category,
          quality: quality || "",
        },
        { new: true, runValidators: true },
      );
      if (!record) return err("Record not found", 404);
      return ok({ record });
    } catch (e) {
      if (e.code === 11000) return err("That ID already exists", 409);
      return serverError(e);
    }
  }, { requireWrite: true });
}
