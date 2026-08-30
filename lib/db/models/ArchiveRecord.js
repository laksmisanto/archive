import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const ArchiveRecordSchema = new Schema({
  videoId:      { type: String, required: true, trim: true },
  driveId:      { type: Schema.Types.ObjectId, ref: 'Drive' },
  driveLabel:   { type: String, trim: true },
  reporterId:   { type: Schema.Types.ObjectId, ref: 'Reporter' },
  reporterName: { type: String, trim: true },
  metadata:     { type: String, required: true, maxlength: 10000 },
  archiveDate:  {type: Date, required: true},
  ownerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  batchId:      { type: Schema.Types.ObjectId, ref: 'Batch' },
  status:       { type: String, enum: ['draft', 'committed'], default: 'draft' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true });

ArchiveRecordSchema.index({ ownerId: 1, videoId: 1 }, { unique: true });
ArchiveRecordSchema.index({ ownerId: 1, batchId: 1 });
ArchiveRecordSchema.index({ ownerId: 1, createdAt: -1 });
ArchiveRecordSchema.index({ ownerId: 1, reporterId: 1 });
ArchiveRecordSchema.index({ ownerId: 1, driveId: 1 });
ArchiveRecordSchema.index({ ownerId: 1, deletedAt: 1 });
// Useful for date filtering
ArchiveRecordSchema.index({ ownerId: 1, archiveDate: -1 });
ArchiveRecordSchema.index(
  { metadata: 'text', videoId: 'text', reporterName: 'text', driveLabel: 'text' },
  { weights: { metadata: 10, videoId: 5, reporterName: 3, driveLabel: 1 }, name: 'archive_text_search' }
);

export default models.ArchiveRecord || model('ArchiveRecord', ArchiveRecordSchema);
