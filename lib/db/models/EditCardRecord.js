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
    metadata:  { type: String, required: true, maxlength: 10000, trim: true },
    ownerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EditCardRecordSchema.index({ ownerId: 1, entryId: 1 }, { unique: true });
EditCardRecordSchema.index({ ownerId: 1, createdAt: -1 });
EditCardRecordSchema.index({ ownerId: 1, deletedAt: 1 });
EditCardRecordSchema.index(
  { metadata: 'text', entryId: 'text' },
  { weights: { metadata: 10, entryId: 5 }, name: 'editcard_text_search' },
);

export default models.EditCardRecord || model('EditCardRecord', EditCardRecordSchema);
