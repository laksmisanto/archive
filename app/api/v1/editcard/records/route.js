import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db/mongoose";
import EditCardRecord from "@/lib/db/models/EditCardRecord";
import Drive from "@/lib/db/models/Drive";
import Reporter from "@/lib/db/models/Reporter";
import { createEditCardId } from "@/lib/services/editCardIdService";
import { ok, created, err, serverError } from "@/lib/utils/apiResponse";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const positiveInt = (value, fallback, maximum) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};
const assetTypeValue = (value) => {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return code === "GV" ? "GVW" : code;
};
const categoryValue = (value) => (typeof value === "string" ? value.trim().toUpperCase() : "");
const qualityValue = (value) => (typeof value === "string" ? value.trim().toUpperCase() : "");
const categoryOptions = ["SPORT", "BUSINESS", "WEATHER", "SCIENCE", "POLITICAL", "CRIME", "OTHER"];
const qualityOptions = ["SD", "HD", "FHD", "2K", "4K", "8K"];

export async function GET(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
      const { searchParams } = new URL(req.url);
      const page = positiveInt(searchParams.get("page"), 1, 1_000_000);
      const limit = positiveInt(searchParams.get("limit"), 50, 100);
      const q = (searchParams.get("q") || "").slice(0, 200);
      const assetType = assetTypeValue((searchParams.get("assetType") || "").slice(0, 100));
      const category = categoryValue((searchParams.get("category") || "").slice(0, 100));

      const filter = { ownerId: req.user.id, deletedAt: null };

      if (q) {
        const keywords = q.trim().split(/\s+/).filter(Boolean);
        filter.$and = keywords.map((kw) => {
          const re = new RegExp(escapeRegex(kw), "i");
          return { $or: [{ entryId: re }, { metadata: re }, { drive: re }, { reporter: re }, { assetType: re }, { category: re }] };
        });
      }
      if (assetType) filter.assetType = assetType;
      if (category) filter.category = category;

      const typesFilter = { ownerId: req.user.id, deletedAt: null, assetType: { $nin: ["", null] } };
      const [records, total, assetTypes, categories] = await Promise.all([
        EditCardRecord.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        EditCardRecord.countDocuments(filter),
        EditCardRecord.distinct("assetType", typesFilter),
        EditCardRecord.distinct("category", { ownerId: req.user.id, deletedAt: null, category: { $nin: ["", null] } }),
      ]);

      return ok({
        records,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        assetTypes: assetTypes.sort(),
        categories: categories.sort(),
      });
    } catch (e) {
      return serverError(e);
    }
  });
}

export async function POST(request) {
  return withAuth(request, async (req) => {
    try {
      await connectDB();
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

      const entryId = await createEditCardId({ ownerId: req.user.id, metadata, assetType });
      const archiveDate = body.archiveDate ? new Date(body.archiveDate) : null;
      if (archiveDate && Number.isNaN(archiveDate.getTime())) return err("Invalid date");

      const record = await EditCardRecord.create({
        entryId,
        archiveDate,
        metadata,
        drive: driveExists.label,
        reporter: typeof body.reporter === "string" ? body.reporter.trim() : "",
        assetType,
        category,
        quality: quality || "",
        ownerId: req.user.id,
      });

      return created({ record });
    } catch (e) {
      if (e.code === 11000) return err("That ID already exists", 409);
      return serverError(e);
    }
  }, { requireWrite: true });
}
