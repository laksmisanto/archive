import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

/**
 * Standalone, simplified schema for emergency "edit card" imports.
 * Fully isolated from ArchiveRecord — its own collection, own ID space,
 * own search index. Safe to delete this model + its API routes entirely
 * once the emergency import need is over; it has no relation to ArchiveRecord.
 */
const EditCardRecordSchema = new Schema(
  {
    entryId:   { type: String, required: true, trim: true },
    archiveDate: { type: Date, default: null },
    drive:     { type: String, required: true, trim: true },
    metadata:  { type: String, required: true, maxlength: 10000, trim: true },
    reporter:  { type: String, trim: true, default: "" },
    assetType: { type: String, required: true, trim: true, uppercase: true, match: /^[A-Z0-9]{3}$/ },
    category: { type: String, trim: true, default: "", uppercase: true, match: /^[A-Z]+$/ },
    quality: { type: String, trim: true, default: "", uppercase: true, enum: ["", "SD", "HD", "FHD", "2K", "4K", "8K"] },
    ownerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EditCardRecordSchema.index({ ownerId: 1, entryId: 1 }, { unique: true });
EditCardRecordSchema.index({ ownerId: 1, createdAt: -1 });
EditCardRecordSchema.index({ ownerId: 1, deletedAt: 1 });
EditCardRecordSchema.index({ ownerId: 1, assetType: 1, createdAt: -1 });
EditCardRecordSchema.index({ ownerId: 1, category: 1, createdAt: -1 });
EditCardRecordSchema.index(
  { metadata: 'text', entryId: 'text', drive: 'text', reporter: 'text', assetType: 'text', category: 'text' },
  { weights: { metadata: 10, entryId: 5, reporter: 3, drive: 2, category: 2 }, name: 'editcard_text_search' },
);

export default models.EditCardRecord || model('EditCardRecord', EditCardRecordSchema);
